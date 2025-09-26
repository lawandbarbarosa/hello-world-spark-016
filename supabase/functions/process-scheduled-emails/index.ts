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
      throw new Error(`Gmail sync failed: ${error}`);
    }

    const result = await response.json();
    if (result.success) {
      console.log("Email synced to Gmail Sent folder:", result.gmailMessageId);
    } else {
      console.log("Gmail sync not configured or failed:", result.message);
    }
  } catch (error) {
    console.warn("Gmail sync error (non-critical):", error);
    // Don't throw - this is non-critical
  }
}

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

    // Check if this is a manual trigger
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual || false;
    
    if (isManual) {
      console.log("🔧 Manual trigger detected");
    }

    // Get scheduled emails that are ready to be sent
    const now = new Date();
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString())
      .limit(50); // Process up to 50 emails at a time

    if (scheduledError) {
      console.error("Error fetching scheduled emails:", scheduledError);
      return new Response(JSON.stringify({ error: "Error fetching scheduled emails" }), {
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

        // Check if campaign is active - skip paused campaigns
        if (campaign.status !== 'active') {
          console.log(`Campaign ${campaign.id} is ${campaign.status}, skipping scheduled email`);
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

        // Check sender daily limit
        const todayStart = new Date(zonedTime.getFullYear(), zonedTime.getMonth(), zonedTime.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const { count: senderSentCount } = await supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('sender_account_id', scheduledEmail.sender_account_id)
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString())
          .in('status', ['sent', 'pending']);

        const sentToday = senderSentCount || 0;
        const remainingCapacity = Math.max(0, senderAccount.daily_limit - sentToday);

        if (remainingCapacity <= 0) {
          console.log(`Sender ${senderAccount.email} has reached daily limit`);
          continue; // Skip this email for now
        }

        // Mark as being processed
        await supabase
          .from("scheduled_emails")
          .update({
            status: "processing",
            attempts: scheduledEmail.attempts + 1
          })
          .eq("id", scheduledEmail.id);

        // Personalize email content
        const fallbackTags = userSettings?.fallback_merge_tags || { first_name: 'there', company: 'your company' };

        let personalizedSubject = personalizeText(sequence.subject, contact, fallbackTags);
        let personalizedBody = personalizeText(sequence.body, contact, fallbackTags);

        // Create email send record
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

        // Send email
        console.log(`Sending follow-up email step ${sequence.step_number} to ${contact.email}`);
        
        const emailResponse = await resend.emails.send({
          from: senderAccount.email,
          to: [contact.email],
          subject: personalizedSubject,
          html: emailBodyWithTracking,
        });

        if (emailResponse.error) {
          console.error("Email send error:", emailResponse.error);
          failedCount++;
          
          // Mark both records as failed with detailed categorization
          const { error: updateError } = await supabase
            .rpc('update_email_failure_details', {
              email_send_id_param: emailSendRecord.id,
              error_message_param: JSON.stringify(emailResponse.error),
              status_param: 'failed'
            });

          if (updateError) {
            console.error('Error updating email failure details:', updateError);
            // Fallback to basic update if categorization fails
            await supabase.from("email_sends").update({
              status: "failed",
              error_message: JSON.stringify(emailResponse.error),
            }).eq("id", emailSendRecord.id);
          }

          await supabase.from("scheduled_emails").update({
            status: "failed",
            error_message: JSON.stringify(emailResponse.error),
          }).eq("id", scheduledEmail.id);
        } else {
          console.log("Follow-up email sent successfully:", emailResponse.data?.id);
          processedCount++;
          
          // Mark both records as sent
          await Promise.all([
            supabase.from("email_sends").update({
              status: "sent",
              sent_at: now.toISOString(),
            }).eq("id", emailSendRecord.id),
            
            supabase.from("scheduled_emails").update({
              status: "sent",
            }).eq("id", scheduledEmail.id)
          ]);

          // Sync to Gmail Sent folder if enabled
          try {
            await syncToGmailSent({
              emailSendId: emailSendRecord.id,
              senderEmail: senderAccount.email,
              recipientEmail: contact.email,
              subject: personalizedSubject,
              body: emailBodyWithTracking,
              sentAt: now.toISOString()
            });
          } catch (syncError) {
            console.warn("Failed to sync to Gmail (non-critical):", syncError);
            // Don't fail the email send if Gmail sync fails
          }
        }

      } catch (error) {
        console.error("Error processing scheduled email:", scheduledEmail.id, error);
        failedCount++;
        
        // Mark as failed
        await supabase
          .from("scheduled_emails")
          .update({
            status: "failed",
            error_message: (error as Error).message,
          })
          .eq("id", scheduledEmail.id);
      }
    }

    console.log(`Processed ${processedCount} emails, ${failedCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      failed: failedCount,
      message: `Processed ${processedCount} scheduled emails, ${failedCount} failed`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in process-scheduled-emails function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

// Helper function to personalize text with merge tags
function personalizeText(text: string, contact: any, fallbackTags: any): string {
  let result = text;
  
  console.log(`personalizeText called with text:`, text);
  console.log(`Contact data:`, contact);
  console.log(`Available contact fields:`, Object.keys(contact));

  // Replace with fallback support {{field|fallback}}
  result = result.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, field, fallback) => {
    console.log(`Fallback replacement for "${field}":`, contact[field] || fallback);
    return contact[field] || fallback;
  });

  // Replace simple merge tags with comprehensive field matching (same logic as initial emails)
  result = result.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    console.log(`Template replacement: Looking for field "${field}" in contact:`, contact);
    console.log(`Available contact fields:`, Object.keys(contact));
    console.log(`Custom fields:`, contact.custom_fields);
    
    // Check direct field match first
    if (contact[field] !== undefined && contact[field] !== null) {
      console.log(`Direct match found for "${field}":`, contact[field]);
      return String(contact[field]);
    }
    
    // Check custom_fields JSON if it exists
    if (contact.custom_fields && typeof contact.custom_fields === 'object') {
      if (contact.custom_fields[field] !== undefined && contact.custom_fields[field] !== null) {
        console.log(`Custom field match found for "${field}":`, contact.custom_fields[field]);
        return String(contact.custom_fields[field]);
      }
      
      // Check case-insensitive match in custom_fields
      const fieldLower = field.toLowerCase();
      const customFieldKey = Object.keys(contact.custom_fields).find(key => key.toLowerCase() === fieldLower);
      if (customFieldKey && contact.custom_fields[customFieldKey] !== undefined && contact.custom_fields[customFieldKey] !== null) {
        console.log(`Case-insensitive custom field match found for "${field}" -> "${customFieldKey}":`, contact.custom_fields[customFieldKey]);
        return String(contact.custom_fields[customFieldKey]);
      }
    }
    
    // Check case-insensitive match in main contact object
    const fieldLower = field.toLowerCase();
    const contactKey = Object.keys(contact).find(key => key.toLowerCase() === fieldLower);
    if (contactKey && contact[contactKey] !== undefined && contact[contactKey] !== null) {
      console.log(`Case-insensitive match found for "${field}" -> "${contactKey}":`, contact[contactKey]);
      return String(contact[contactKey]);
    }
    
    // Legacy field mappings for backward compatibility
    if (field === 'firstName' || field === 'first_name') {
      const value = contact.first_name || contact.firstName || (contact.custom_fields && contact.custom_fields.firstName) || (contact.custom_fields && contact.custom_fields.first_name) || fallbackTags.first_name;
      console.log(`Legacy firstName mapping for "${field}":`, value);
      return value;
    }
    if (field === 'lastName' || field === 'last_name') {
      const value = contact.last_name || contact.lastName || (contact.custom_fields && contact.custom_fields.lastName) || (contact.custom_fields && contact.custom_fields.last_name) || '';
      console.log(`Legacy lastName mapping for "${field}":`, value);
      return value;
    }
    if (field === 'company') {
      const value = contact.company || (contact.custom_fields && contact.custom_fields.company) || fallbackTags.company;
      console.log(`Legacy company mapping for "${field}":`, value);
      return value;
    }
    
    // Additional check: if custom_fields exists, try to find any field that might match
    if (contact.custom_fields && typeof contact.custom_fields === 'object') {
      // Try to find any field in custom_fields that might be what we're looking for
      const allCustomKeys = Object.keys(contact.custom_fields);
      console.log(`Checking all custom fields for "${field}":`, allCustomKeys);
      
      // Try exact match first
      if (contact.custom_fields[field] !== undefined && contact.custom_fields[field] !== null) {
        console.log(`Found exact match in custom_fields for "${field}":`, contact.custom_fields[field]);
        return String(contact.custom_fields[field]);
      }
      
      // Try case-insensitive match
      const matchingKey = allCustomKeys.find(key => key.toLowerCase() === field.toLowerCase());
      if (matchingKey && contact.custom_fields[matchingKey] !== undefined && contact.custom_fields[matchingKey] !== null) {
        console.log(`Found case-insensitive match in custom_fields for "${field}" -> "${matchingKey}":`, contact.custom_fields[matchingKey]);
        return String(contact.custom_fields[matchingKey]);
      }
    }
    
    // Return the tag unchanged if no match found
    console.log(`No match found for "${field}", returning unchanged:`, match);
    return match;
  });

  console.log(`Final personalized text:`, result);
  return result;
}

serve(handler);
