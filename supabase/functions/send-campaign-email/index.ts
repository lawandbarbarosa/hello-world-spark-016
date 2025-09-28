import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { toZonedTime, fromZonedTime } from "https://esm.sh/date-fns-tz@3.0.0";
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

interface SendEmailRequest {
  campaignId: string;
}

// Helper function to schedule follow-up emails
async function scheduleFollowUpEmails(
  supabase: any,
  campaignId: string,
  contactId: string,
  senderAccountId: string,
  sequences: any[],
  firstEmailSentTime: Date
) {
  try {
    // Get follow-up sequences (skip step 1 as it's already sent)
    const followUpSequences = sequences.filter(seq => seq.step_number > 1).sort((a, b) => a.step_number - b.step_number);
    
    if (followUpSequences.length === 0) {
      console.log("No follow-up sequences to schedule");
      return;
    }

    for (const sequence of followUpSequences) {
      let scheduledTime: Date;

      // Check if sequence has specific scheduling data (new format)
      if (sequence.scheduled_date && sequence.scheduled_time) {
        // Parse the scheduled date and time for Kurdistan timezone (Asia/Baghdad, UTC+3)
        const dateStr = sequence.scheduled_date;
        const timeRaw: string = sequence.scheduled_time;

        // Normalize time to HH:mm:ss
        const parts = timeRaw.split(":");
        const hh = parts[0]?.padStart(2, "0") ?? "00";
        const mm = parts[1]?.padStart(2, "0") ?? "00";
        const ss = (parts[2] ?? "00").padStart(2, "0");
        const timeStr = `${hh}:${mm}:${ss}`;

        // Build a zoned Date in Asia/Baghdad and convert to UTC Date
        const zonedDateTimeStr = `${dateStr} ${timeStr}`; // e.g. 2025-09-22 14:30:00
        scheduledTime = fromZonedTime(zonedDateTimeStr, 'Asia/Baghdad');

        // Validate that the scheduled time is in the future
        const now = new Date();
        if (scheduledTime <= now) {
          console.warn(`Scheduled time ${scheduledTime.toISOString()} is in the past, skipping step ${sequence.step_number}`);
          continue; // Skip this sequence
        }

        console.log(`Scheduling step ${sequence.step_number} for specific date/time (Kurdistan ${'Asia/Baghdad'}): ${scheduledTime.toISOString()}`);
        console.log(`Kurdistan local time (Asia/Baghdad): ${new Date(toZonedTime(scheduledTime, 'Asia/Baghdad')).toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })}`);
      } else {
        // Fallback to delay-based scheduling (legacy support)
        const delayInMinutes = calculateDelayInMinutes(sequence.delay_amount, sequence.delay_unit);
        scheduledTime = new Date(firstEmailSentTime.getTime() + delayInMinutes * 60 * 1000);
        
        console.log(`Scheduling step ${sequence.step_number}: ${delayInMinutes} minutes after first email (${scheduledTime.toISOString()})`);
      }

      // Create scheduled email record
      const { error: scheduleError } = await supabase
        .from("scheduled_emails")
        .insert({
          campaign_id: campaignId,
          contact_id: contactId,
          sequence_id: sequence.id,
          sender_account_id: senderAccountId,
          scheduled_for: scheduledTime.toISOString(),
          status: "scheduled"
        });

      if (scheduleError) {
        console.error("Error scheduling follow-up email:", scheduleError);
      } else {
        console.log(`Scheduled follow-up email step ${sequence.step_number} for ${scheduledTime.toISOString()}`);
      }
    }
  } catch (error) {
    console.error("Error in scheduleFollowUpEmails:", error);
  }
}

// Helper function to convert delay amount and unit to minutes
function calculateDelayInMinutes(amount: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'minutes':
      return amount;
    case 'hours':
      return amount * 60;
    case 'days':
      return amount * 24 * 60;
    case 'weeks':
      return amount * 7 * 24 * 60;
    default:
      return amount * 24 * 60; // Default to days
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId }: SendEmailRequest = await req.json();
    console.log("Processing campaign:", campaignId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user settings for sending permissions and formatting
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", campaign.user_id)
      .single();

    // Skip time window check - first emails send immediately
    console.log("Time window check skipped - first emails send immediately");

    // Get email sequences for the campaign
    const { data: sequences, error: sequenceError } = await supabase
      .from("email_sequences")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("step_number");

    if (sequenceError || !sequences || sequences.length === 0) {
      console.error("No email sequences found:", sequenceError);
      return new Response(JSON.stringify({ error: "No email sequences found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contacts for the campaign with detailed logging (exclude replied contacts)
    console.log("Fetching contacts for campaign:", campaignId);
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .is("replied_at", null);

    console.log("Contacts query result:", { contacts, error: contactsError, count: contacts?.length });

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      return new Response(JSON.stringify({ error: `Error fetching contacts: ${contactsError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contacts || contacts.length === 0) {
      console.log("No contacts found for campaign - checking all contacts in database");
      
      // Debug: Check if contacts exist at all for this campaign
      const { data: allContacts, error: allContactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("campaign_id", campaignId);
      
      console.log("All contacts for campaign (any status):", { allContacts, error: allContactsError, count: allContacts?.length });
      
      return new Response(JSON.stringify({ 
        error: `No active contacts found for campaign. Total contacts in campaign: ${allContacts?.length || 0}`,
        debug: { campaignId, allContacts: allContacts?.slice(0, 3) } // Show first 3 for debugging
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender accounts for the campaign
    const { data: senderAccounts, error: senderError } = await supabase
      .from("sender_accounts")
      .select("*")
      .eq("campaign_id", campaignId);

    if (senderError || !senderAccounts || senderAccounts.length === 0) {
      console.error("No sender accounts found:", senderError);
      return new Response(JSON.stringify({ error: "No sender accounts found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate individual sender account capacities
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const availableSenders = [];
    let totalAvailableCapacity = 0;

    for (const sender of senderAccounts) {
      // Get sent count for this specific sender today
      const { count: senderSentCount, error: senderCountError } = await supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('sender_account_id', sender.id)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .in('status', ['sent', 'pending']);

      const sentToday = senderCountError ? 0 : (senderSentCount || 0);
      const remainingCapacity = Math.max(0, sender.daily_limit - sentToday);

      if (remainingCapacity > 0) {
        availableSenders.push({
          ...sender,
          sentToday,
          remainingCapacity
        });
        totalAvailableCapacity += remainingCapacity;
      }

      console.log(`Sender ${sender.email}: ${sentToday}/${sender.daily_limit} sent today, ${remainingCapacity} remaining`);
    }

    if (availableSenders.length === 0) {
      console.log("No sender accounts have remaining capacity");
      return new Response(JSON.stringify({ 
        error: "All sender accounts have reached their daily limits. Try again tomorrow or increase sender daily limits."
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit contacts to available capacity across all senders
    const contactsToProcess = contacts.slice(0, totalAvailableCapacity);
    console.log(`Processing ${contactsToProcess.length} contacts (${totalAvailableCapacity} total capacity across ${availableSenders.length} senders)`);
    
    // Log individual sender capacities
    availableSenders.forEach(sender => {
      console.log(`Sender ${sender.email}: ${sender.remainingCapacity}/${sender.daily_limit} capacity remaining`);
    });

    // Process the first email sequence (step 1)
    const firstSequence = sequences.find(seq => seq.step_number === 1);
    if (!firstSequence) {
      return new Response(JSON.stringify({ error: "No first email sequence found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;
    let emailsError = 0;
    let senderIndex = 0;

     // Send emails to contacts using round-robin across senders, respecting individual limits
    for (const contact of contactsToProcess) {
      // Find sender with remaining capacity
      let currentSender = null;
      
      // Filter senders that still have capacity
      const sendersWithCapacity = availableSenders.filter(sender => sender.remainingCapacity > 0);
      
      if (sendersWithCapacity.length === 0) {
        console.log("No more senders with remaining capacity");
        break;
      }
      
      // Use round-robin among senders with capacity
      currentSender = sendersWithCapacity[senderIndex % sendersWithCapacity.length];
      console.log(`Selected sender ${currentSender.email} with ${currentSender.remainingCapacity} remaining capacity`);
      
      // Move to next sender in round-robin for next iteration
      senderIndex = (senderIndex + 1) % sendersWithCapacity.length;

      try {
        // Get fallback merge tags from user settings
        const fallbackTags = userSettings?.fallback_merge_tags || { first_name: 'there', company: 'your company' };
        
        // Robust merge tag replacement with header normalization
        const nbsp = /\u00A0/g;
        const normalizeKey = (s: string) =>
          s
            .replace(nbsp, ' ')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
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
          let out = text.replace(/\{\{\s*([^}|]+)\|([^}]+)\s*\}\}/g, (_m, field, fb) => {
            const nk = normalizeKey(String(field));
            const val = map.get(nk) ?? null;
            return val ?? String(fb).trim();
          });
          // {{ field }}
          out = out.replace(/\{\{\s*([^}|]+)\s*\}\}/g, (_m, field) => {
            const nk = normalizeKey(String(field));
            const val = map.get(nk);
            if (val !== undefined) return val;
            // Fallbacks for special keys
            if (nk === 'first name') return String(fallbackTags.first_name ?? '');
            if (nk === 'company') return String(fallbackTags.company ?? '');
            return _m; // keep unresolved to catch later
          });
          return out;
        };

        const contactMap = buildContactMap(contact);

        let personalizedSubject = replaceWithMap(firstSequence.subject, contactMap);
        let personalizedBody = replaceWithMap(firstSequence.body, contactMap);

        // Block send if unresolved tags remain and record a clear error
        const unresolved = Array.from(
          new Set(
            (personalizedSubject + ' ' + personalizedBody)
              .match(/\{\{[^}]+\}\}/g) || []
          )
        );
        if (unresolved.length > 0) {
          const errorMsg = `Unmapped merge tags: ${unresolved.join(', ')}`;
          console.warn(errorMsg, { contact: contact.email });
          // Record failed send with reason and continue
          await supabase
            .from('email_sends')
            .insert({
              campaign_id: campaignId,
              contact_id: contact.id,
              sequence_id: firstSequence.id,
              sender_account_id: currentSender.id,
              status: 'failed',
              error_message: errorMsg,
            });
          emailsError++;
          continue;
        }

        // Create the email send record to get the ID for tracking
        const { data: insertedEmailSend, error: insertError } = await supabase
          .from("email_sends")
          .insert({
            campaign_id: campaignId,
            contact_id: contact.id,
            sequence_id: firstSequence.id,
            sender_account_id: currentSender.id,
            status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating email send record:", insertError);
          emailsError++;
          continue;
        }

        // Format email body with proper HTML preservation
        let finalBody = personalizedBody;
        
        // Check if the content already contains HTML tags
        const isHtmlContent = /<[a-z][\s\S]*>/i.test(finalBody);
        
        // Add signature if provided
        if (userSettings?.default_signature && userSettings.default_signature.trim()) {
          const signature = userSettings.default_signature;
          if (isHtmlContent) {
            // For HTML content, add signature as HTML with black color
            finalBody += `<br><br><div class="signature" style="color: #000000 !important;">${signature.replace(/\n/g, '<br>')}</div>`;
          } else {
            // For plain text, add as text (will be converted to HTML later)
            finalBody += '\n\n' + signature;
          }
        }

        // Add legal disclaimer if provided  
        if (userSettings?.legal_disclaimer && userSettings.legal_disclaimer.trim()) {
          const disclaimer = userSettings.legal_disclaimer;
          if (isHtmlContent) {
            // For HTML content, add disclaimer as HTML with black color
            finalBody += `<br><br><div style="font-size: 11px; color: #000000 !important; margin-top: 15px;">${disclaimer.replace(/\n/g, '<br>')}</div>`;
          } else {
            // For plain text, add as text (will be converted to HTML later)
            finalBody += '\n\n' + disclaimer;
          }
        }

        // Convert to HTML format if needed and add tracking
        let emailBodyWithTracking: string;
        if (isHtmlContent) {
          // Already HTML - wrap in container with black text color and add tracking pixel
          const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${insertedEmailSend.id}" width="1" height="1" style="display:none;" alt="" />`;
          emailBodyWithTracking = `
            <div style="color: #000000 !important; font-family: Arial, sans-serif; line-height: 1.5;">
              ${finalBody}
            </div>
            ${trackingPixel}
          `;
        } else {
          // Convert plain text to HTML with black text color and proper formatting
          const htmlBody = finalBody
            .replace(/\n\n/g, '</p><p style="color: #000000 !important; margin: 1em 0;">')  // Double line breaks become paragraph breaks
            .replace(/\n/g, '<br>')       // Single line breaks become <br>
            .replace(/^(.*)$/, '<p style="color: #000000 !important; margin: 1em 0;">$1</p>'); // Wrap entire content in paragraph tags
          
          const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${insertedEmailSend.id}" width="1" height="1" style="display:none;" alt="" />`;
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
            // Try normalized lookup using the already built contactMap
            const normalizedValue = contactMap.get(emailColumnNormalized);
            if (normalizedValue && normalizedValue.includes('@')) {
              recipientEmail = normalizedValue;
            }
          }
        }

        // Send email using Resend with current sender
        console.log(`Attempting to send email to ${recipientEmail} (from column: ${campaign.email_column || 'email'}) from ${currentSender.email} (${currentSender.remainingCapacity} remaining capacity)`);
        
        const emailResponse = await resend.emails.send({
          from: `${currentSender.email}`,
          to: [recipientEmail],
          subject: personalizedSubject,
          html: emailBodyWithTracking,
        });

        console.log("Resend API response:", emailResponse);

        if (emailResponse.error) {
          console.error("Email send error for", contact.email, ":", emailResponse.error);
          emailsError++;
          
          // Update the email send record with failed status and categorize the failure
          const { error: updateError } = await supabase
            .rpc('update_email_failure_details', {
              email_send_id_param: insertedEmailSend.id,
              error_message_param: JSON.stringify(emailResponse.error),
              status_param: 'failed'
            });

          if (updateError) {
            console.error('Error updating email failure details:', updateError);
            // Fallback to basic update if categorization fails
            await supabase
              .from("email_sends")
              .update({
                status: "failed",
                error_message: JSON.stringify(emailResponse.error),
              })
              .eq("id", insertedEmailSend.id);
          }
        } else {
          console.log("Email sent successfully to", contact.email, "with ID:", emailResponse.data?.id);
          emailsSent++;
          
          const sentTime = new Date();
          
          // Update the email send record with sent status
          await supabase
            .from("email_sends")
            .update({
              status: "sent",
              sent_at: sentTime.toISOString(),
            })
            .eq("id", insertedEmailSend.id);

          // Sync to Gmail Sent folder if enabled
          try {
            await syncToGmailSent({
              emailSendId: insertedEmailSend.id,
              senderEmail: currentSender.email,
              recipientEmail: contact.email,
              subject: personalizedSubject,
              body: emailBodyWithTracking,
              sentAt: sentTime.toISOString()
            });
          } catch (syncError) {
            console.warn("Failed to sync to Gmail (non-critical):", syncError);
            // Don't fail the email send if Gmail sync fails
          }

          // Update sender's remaining capacity in our local array
          const senderInArray = availableSenders.find(s => s.id === currentSender.id);
          if (senderInArray) {
            senderInArray.remainingCapacity--;
            console.log(`Updated ${currentSender.email} remaining capacity to ${senderInArray.remainingCapacity}`);
          }

          // Schedule follow-up emails using the actual sent time
          await scheduleFollowUpEmails(supabase, campaignId, contact.id, currentSender.id, sequences, sentTime);
        }

        
      } catch (error) {
        console.error("Error sending email to contact:", contact.email, error);
        emailsError++;
        
        // Record failed email send if we have a current sender
        if (currentSender) {
          await supabase.from("email_sends").insert({
            campaign_id: campaignId,
            contact_id: contact.id,
            sequence_id: firstSequence.id,
            sender_account_id: currentSender.id,
            status: "failed",
            error_message: (error as Error).message,
          });
        }
      }
    }

    // Update campaign status to launched
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    const message = `Campaign launched successfully. Sent ${emailsSent} emails to contacts who haven't replied yet. ${emailsError} failed.`;

    console.log(`Campaign ${campaignId} processed: ${emailsSent} sent, ${emailsError} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      emailsError,
      message,
      senderStats: availableSenders.map(s => ({
        email: s.email,
        dailyLimit: s.daily_limit,
        sentToday: s.sentToday,
        remainingCapacity: s.remainingCapacity
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-campaign-email function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);