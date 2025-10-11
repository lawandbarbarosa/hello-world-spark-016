import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { toZonedTime } from "https://esm.sh/date-fns-tz@3.0.0";
import { format } from "https://esm.sh/date-fns@3.6.0";

// Security enhancement: Validate required environment variables
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("CRITICAL: RESEND_API_KEY environment variable is not set");
  throw new Error("RESEND_API_KEY is required for email functionality");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to sync email to Gmail Sent folder
async function syncToGmailSent({ emailSendId, senderEmail, recipientEmail, subject, body, sentAt }: {
  emailSendId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-to-gmail-sent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        emailSendId,
        senderEmail,
        recipientEmail,
        subject,
        body,
        sentAt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, message: `Gmail sync failed: ${error}` };
    }

    const result = await response.json();
    if (result.success) {
      console.log("Email synced to Gmail Sent folder:", result.gmailMessageId);
      return result;
    } else {
      console.log("Gmail sync not configured or failed:", result.message);
      return result;
    }
  } catch (error) {
    console.warn("Gmail sync error (non-critical):", error);
    return { success: false, message: (error as Error).message };
  }
}


// Helper functions for email processing
const normalizeKey = (s: string) =>
  s
    .replace(/\u00A0/g, ' ')  // Non-breaking spaces
    .replace(/_/g, ' ')        // Underscores to spaces
    .replace(/\s+/g, ' ')      // Multiple spaces to single
    .trim()
    .toLowerCase();

const buildContactMap = (c: any) => {
  const map = new Map<string, string>();
  // Top-level fields
  Object.keys(c || {}).forEach((key) => {
    if (key === 'custom_fields') return;
    const val = c[key];
    if (val === undefined || val === null || typeof val === 'object') return;
    const nk = normalizeKey(key);
    map.set(nk, String(val));
  });
  // Custom fields
  const cf = c?.custom_fields || {};
  Object.keys(cf).forEach((key) => {
    const val = cf[key];
    if (val === undefined || val === null) return;
    const nk = normalizeKey(key);
    if (!map.has(nk)) map.set(nk, String(val));
  });
  // Common aliases
  const first = c.first_name ?? c.firstName ?? cf.first_name ?? cf.firstName;
  if (first) map.set(normalizeKey('first name'), String(first));
  const last = c.last_name ?? c.lastName ?? cf.last_name ?? cf.lastName;
  if (last) map.set(normalizeKey('last name'), String(last));
  const company = c.company ?? cf.company;
  if (company) map.set(normalizeKey('company'), String(company));
  return map;
};

const replaceWithMap = (text: string, map: Map<string, string>) => {
  if (!text) return text;
  // {{ field | fallback }}
  return text.replace(/\{\{\s*([^|{}]+?)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (match, field, fallback) => {
    const nf = normalizeKey(field);
    const value = map.get(nf);
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
    return fallback ? String(fallback).trim() : match;
  });
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting scheduled email processing...");
    console.log("⏰ Current time:", new Date().toISOString());

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    
    // Check if this is manual trigger (has isManual parameter)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const isManual = body?.isManual === true;
    
    // Get scheduled emails that are ready to send
    const { data: scheduledEmails, error } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString());

    if (error) {
      console.error("Error fetching scheduled emails:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch scheduled emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log("📭 No scheduled emails ready to send");
      
      // If manual trigger, also show all scheduled emails for debugging
      if (isManual) {
        const { data: allScheduled } = await supabase
          .from("scheduled_emails")
          .select("*")
          .order("scheduled_for", { ascending: true });
        
        console.log("📋 All scheduled emails:", allScheduled?.length || 0);
        if (allScheduled && allScheduled.length > 0) {
          allScheduled.forEach(email => {
            console.log(`  - ID: ${email.id}, Status: ${email.status}, Scheduled: ${email.scheduled_for}`);
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        message: "No emails to process", 
        processed: 0,
        debug: isManual ? { allScheduled: scheduledEmails?.length || 0 } : undefined
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📧 Found ${scheduledEmails.length} scheduled emails to process`);

    let processedCount = 0;
    let failedCount = 0;

    for (const scheduledEmail of scheduledEmails) {
      try {
        // Fetch related data with better error handling
        const [
          campaignResult,
          contactResult,
          sequenceResult,
          senderAccountResult
        ] = await Promise.all([
          supabase.from("campaigns").select("*").eq("id", scheduledEmail.campaign_id).single(),
          supabase.from("contacts").select("*").eq("id", scheduledEmail.contact_id).single(),
          supabase.from("email_sequences").select("*").eq("id", scheduledEmail.sequence_id).single(),
          supabase.from("sender_accounts").select("*").eq("id", scheduledEmail.sender_account_id).single()
        ]);

        const campaign = campaignResult.data;
        const contact = contactResult.data;
        const sequence = sequenceResult.data;
        const senderAccount = senderAccountResult.data;

        if (!campaign || campaignResult.error) {
          console.error(`Campaign ${scheduledEmail.campaign_id} not found for scheduled email ${scheduledEmail.id}:`, campaignResult.error);
          await supabase.from("scheduled_emails").update({ status: "failed", error_message: "Campaign not found" }).eq("id", scheduledEmail.id);
          continue;
        }

        // Only skip if campaign is explicitly paused
        if (campaign.status === 'paused') {
          console.log(`Campaign ${campaign.id} is paused, skipping scheduled email`);
          continue;
        }

        if (!contact || contactResult.error) {
          console.error(`Contact ${scheduledEmail.contact_id} not found for scheduled email ${scheduledEmail.id}:`, contactResult.error);
          await supabase.from("scheduled_emails").update({ status: "failed", error_message: "Contact not found" }).eq("id", scheduledEmail.id);
          continue;
        }

        if (!sequence || sequenceResult.error) {
          console.error(`Sequence ${scheduledEmail.sequence_id} not found for scheduled email ${scheduledEmail.id}:`, sequenceResult.error);
          await supabase.from("scheduled_emails").update({ status: "failed", error_message: "Email sequence not found" }).eq("id", scheduledEmail.id);
          continue;
        }

        if (!senderAccount || senderAccountResult.error) {
          console.error(`Sender account ${scheduledEmail.sender_account_id} not found for scheduled email ${scheduledEmail.id}:`, senderAccountResult.error);
          await supabase.from("scheduled_emails").update({ status: "failed", error_message: "Sender account not found" }).eq("id", scheduledEmail.id);
          continue;
        }

        // Check if contact has replied (skip if they have)
        if (contact.replied_at) {
          console.log(`Contact ${contact.email} has replied, skipping follow-up`);
          
          // Mark as cancelled instead of failed
          await supabase
            .from("scheduled_emails")
            .update({
              status: "cancelled",
              error_message: "Contact replied, follow-up cancelled"
            })
            .eq("id", scheduledEmail.id);
          
          continue;
        }

        // Get user settings for timezone and formatting
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", campaign.user_id)
          .single();

        // Get user timezone for daily limit calculations
        const userTimezone = userSettings?.timezone || 'Asia/Baghdad'; // Kurdistan region timezone
        const zonedTime = toZonedTime(now, userTimezone);
        
        // Check if this is a specifically scheduled email (has scheduled_date and scheduled_time)
        const isSpecificScheduled = sequence.scheduled_date && sequence.scheduled_time;
        
        if (!isSpecificScheduled) {
          // Only apply time window restrictions for delay-based emails, not specifically scheduled ones
          const currentTime = format(zonedTime, 'HH:mm');
          
          const startTime = userSettings?.send_time_start || '08:00';
          const endTime = userSettings?.send_time_end || '18:00';
          
          console.log(`Current time in Kurdistan (${userTimezone}): ${currentTime}`);

          if (currentTime < startTime || currentTime > endTime) {
            console.log(`Skipping delay-based email outside time window: ${currentTime} not in ${startTime}-${endTime}`);
            continue; // Skip this email for now, will be processed in the next run
          }
        } else {
          console.log(`Processing specifically scheduled email at exact time: ${scheduledEmail.scheduled_for}`);
        }

        // Update scheduled email status to processing
        await supabase
          .from("scheduled_emails")
          .update({
            status: "processing",
            attempts: scheduledEmail.attempts + 1
          })
          .eq("id", scheduledEmail.id);

        // Personalize email content using the robust contact map approach
        const contactMap = buildContactMap(contact);
        const fallbackTags = userSettings?.fallback_merge_tags || { first_name: 'there', company: 'your company' };
        
        let personalizedSubject = replaceWithMap(sequence.subject, contactMap);
        let personalizedBody = replaceWithMap(sequence.body, contactMap);

        // Block send if unresolved tags remain and mark scheduled email failed
        const unresolved = Array.from(
          new Set(
            (personalizedSubject + ' ' + personalizedBody)
              .match(/\{\{[^}]+\}\}/g) || []
          )
        );
        if (unresolved.length > 0) {
          const errorMsg = `Unresolved template tags: ${unresolved.join(', ')}`;
          console.error(errorMsg);
          await Promise.all([
            supabase.from("scheduled_emails").update({
              status: "failed",
              error_message: errorMsg
            }).eq("id", scheduledEmail.id)
          ]);
          failedCount++;
          continue;
        }

        // Create email send record for tracking
        const { data: emailSendRecord, error: insertError } = await supabase
          .from("email_sends")
          .insert({
            campaign_id: scheduledEmail.campaign_id,
            contact_id: scheduledEmail.contact_id,
            sequence_id: scheduledEmail.sequence_id,
            sender_account_id: scheduledEmail.sender_account_id,
            status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating email send record:", insertError);
          failedCount++;
          continue;
        }

        // Format final email body with proper HTML preservation
        let finalBody = personalizedBody;
        
        // Check if the content already contains HTML tags
        const isHtmlContent = /<[a-z][\s\S]*>/i.test(finalBody);

        // Add signature
        if (userSettings?.default_signature && userSettings.default_signature.trim()) {
          const signature = userSettings.default_signature;
          if (isHtmlContent) {
            finalBody += `<br><br><div class="signature" style="color: #000000 !important;">${signature.replace(/\n/g, '<br>')}</div>`;
          } else {
            finalBody += '\n\n' + signature;
          }
        }

        // Add legal disclaimer
        if (userSettings?.legal_disclaimer && userSettings.legal_disclaimer.trim()) {
          const disclaimer = userSettings.legal_disclaimer;
          if (isHtmlContent) {
            finalBody += `<br><br><div style="font-size: 11px; color: #000000 !important; margin-top: 15px;">${disclaimer.replace(/\n/g, '<br>')}</div>`;
          } else {
            finalBody += '\n\n' + disclaimer;
          }
        }

        // Convert to HTML format and add tracking
        let emailBodyWithTracking: string;
        if (isHtmlContent) {
          // Already HTML - wrap in container with black text color and add tracking pixel
          const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${emailSendRecord.id}" width="1" height="1" style="display:none;" alt="" />`;
          emailBodyWithTracking = `
            <div style="color: #000000 !important; font-family: Arial, sans-serif; line-height: 1.5;">
              ${finalBody}
            </div>
            ${trackingPixel}
          `;
        } else {
          // Convert plain text to HTML with black text color
          const htmlBody = finalBody
            .replace(/\n\n/g, '</p><p style="color: #000000 !important; margin: 1em 0;">')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p style="color: #000000 !important; margin: 1em 0;">$1</p>');
          
          const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${emailSendRecord.id}" width="1" height="1" style="display:none;" alt="" />`;
          emailBodyWithTracking = `
            <div style="color: #000000 !important; font-family: Arial, sans-serif; line-height: 1.5;">
              ${htmlBody}
            </div>
            ${trackingPixel}
          `;
        }

        // Get recipient email from contact using the specified email column
        const emailColumnNormalized = normalizeKey(campaign.email_column || 'email');
        let recipientEmail = contact.email; // Default fallback
        
        // Try to find the email from custom fields using the selected email column
        if (campaign.email_column && campaign.email_column !== 'email') {
          // First try direct field access
          const directValue = contact[campaign.email_column] || contact.custom_fields?.[campaign.email_column];
          if (directValue && typeof directValue === 'string' && directValue.includes('@')) {
            recipientEmail = directValue;
          } else {
            // Try normalized lookup
            const normalizedValue = contactMap.get(emailColumnNormalized);
            if (normalizedValue && normalizedValue.includes('@')) {
              recipientEmail = normalizedValue;
            }
          }
        }

        // Send email
        console.log(`Sending follow-up email step ${sequence.step_number} to ${recipientEmail} (from column: ${campaign.email_column || 'email'})`);
        
        const emailResponse = await resend.emails.send({
          from: senderAccount.email,
          to: [recipientEmail],
          subject: personalizedSubject,
          html: emailBodyWithTracking,
        });

        if (emailResponse.error) {
          console.error("Email send error:", emailResponse.error);
          failedCount++;
          
          // Create detailed error message with context
          const detailedError = {
            recipient: recipientEmail,
            sender: senderAccount.email,
            subject: personalizedSubject,
            error: emailResponse.error,
            timestamp: new Date().toISOString(),
            campaignId: scheduledEmail.campaign_id,
            contactId: scheduledEmail.contact_id,
            sequenceStep: sequence.step_number,
            scheduledFor: scheduledEmail.scheduled_for
          };
          
          // Mark both records as failed with detailed categorization
          const { error: updateError } = await supabase
            .rpc('update_email_failure_details', {
              email_send_id_param: emailSendRecord.id,
              error_message_param: JSON.stringify(detailedError),
              status_param: 'failed'
            });

          if (updateError) {
            console.error('Error updating email failure details:', updateError);
            // Fallback to basic update if categorization fails
            await supabase.from("email_sends").update({
              status: "failed",
              error_message: JSON.stringify(detailedError),
            }).eq("id", emailSendRecord.id);
          }

          await supabase.from("scheduled_emails").update({
            status: "failed",
            error_message: JSON.stringify(detailedError),
          }).eq("id", scheduledEmail.id);
        } else {
          console.log("Follow-up email sent successfully:", emailResponse.data?.id);
          processedCount++;
          
          // Mark both records as sent
          await Promise.all([
            supabase.from("email_sends").update({
              status: "sent",
              sent_at: new Date().toISOString(),
            }).eq("id", emailSendRecord.id),
            
            supabase.from("scheduled_emails").update({
              status: "sent",
            }).eq("id", scheduledEmail.id)
          ]);

          // Send notification if enabled
          try {
            const { data: userSettings } = await supabase
              .from('user_settings')
              .select('scheduled_email_notifications_enabled, notification_email')
              .eq('user_id', campaign.user_id)
              .single();

            if (userSettings?.scheduled_email_notifications_enabled && userSettings?.notification_email) {
              console.log(`📧 Sending scheduled email notification to ${userSettings.notification_email}`);
              
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              await fetch(`${supabaseUrl}/functions/v1/send-scheduled-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                },
                body: JSON.stringify({
                  notificationEmail: userSettings.notification_email,
                  campaignName: campaign.name,
                  contactEmail: recipientEmail,
                  sequenceStep: sequence.step_number,
                  subject: personalizedSubject,
                  sentAt: new Date().toISOString()
                })
              });
            }
          } catch (notificationError) {
            console.warn("Failed to send notification (non-critical):", notificationError);
            // Don't fail the email send if notification fails
          }

          // Sync to Gmail Sent folder
          try {
            const syncResult = await syncToGmailSent({
              emailSendId: emailSendRecord.id,
              senderEmail: senderAccount.email,
              recipientEmail: recipientEmail,
              subject: personalizedSubject,
              body: emailBodyWithTracking,
              sentAt: new Date().toISOString()
            });
            
            if (syncResult && !syncResult.success) {
              console.warn(`Gmail sync failed for ${recipientEmail}:`, syncResult.message);
              // Update email_sends record with sync error details
              await supabase
                .from("email_sends")
                .update({
                  gmail_sync_error: syncResult.message,
                  gmail_synced: false
                })
                .eq("id", emailSendRecord.id);
            }
          } catch (syncError) {
            console.warn("Failed to sync to Gmail (non-critical):", syncError);
            // Update email_sends record with sync error
            await supabase
              .from("email_sends")
              .update({
                gmail_sync_error: (syncError as Error).message,
                gmail_synced: false
              })
              .eq("id", emailSendRecord.id);
            // Don't fail the email send if Gmail sync fails
          }
        }

      } catch (emailError) {
        console.error("Error processing scheduled email:", emailError);
        failedCount++;
        
        // Mark as failed
        await supabase.from("scheduled_emails").update({
          status: "failed",
          error_message: emailError instanceof Error ? emailError.message : String(emailError),
        }).eq("id", scheduledEmail.id);
      }
    }

    console.log(`✅ Processed ${processedCount} emails successfully, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} scheduled emails`,
        processed: processedCount,
        failed: failedCount,
        total: scheduledEmails.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in scheduled email processing:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);