import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@2.0.0";
import { toZonedTime, format } from "npm:date-fns-tz@3.0.0";

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing scheduled emails...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.log("No scheduled emails ready to send");
      return new Response(JSON.stringify({ message: "No emails to process", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${scheduledEmails.length} scheduled emails to process`);

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

        // Check time window
        const userTimezone = userSettings?.timezone || 'UTC';
        const zonedTime = toZonedTime(now, userTimezone);
        const currentTime = format(zonedTime, 'HH:mm', { timeZone: userTimezone });
        
        const startTime = userSettings?.send_time_start || '08:00';
        const endTime = userSettings?.send_time_end || '18:00';

        if (currentTime < startTime || currentTime > endTime) {
          console.log(`Skipping email outside time window: ${currentTime} not in ${startTime}-${endTime}`);
          continue; // Skip this email for now, will be processed in the next run
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

        // Format final email body
        let finalBody = personalizedBody;

        // Add signature
        if (userSettings?.default_signature && userSettings.default_signature.trim()) {
          finalBody += '\n\n' + userSettings.default_signature;
        }

        // Add legal disclaimer
        if (userSettings?.legal_disclaimer && userSettings.legal_disclaimer.trim()) {
          finalBody += '\n\n' + userSettings.legal_disclaimer;
        }

        // Add tracking pixel
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${emailSendRecord.id}" width="1" height="1" style="display:none;" alt="" />`;
        const emailBodyWithTracking = finalBody.replace(/\n/g, '<br>') + trackingPixel;

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
          
          // Mark both records as failed
          await Promise.all([
            supabase.from("email_sends").update({
              status: "failed",
              error_message: JSON.stringify(emailResponse.error),
            }).eq("id", emailSendRecord.id),
            
            supabase.from("scheduled_emails").update({
              status: "failed",
              error_message: JSON.stringify(emailResponse.error),
            }).eq("id", scheduledEmail.id)
          ]);
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
        }

      } catch (error) {
        console.error("Error processing scheduled email:", scheduledEmail.id, error);
        failedCount++;
        
        // Mark as failed
        await supabase
          .from("scheduled_emails")
          .update({
            status: "failed",
            error_message: error.message,
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
      JSON.stringify({ error: error.message }),
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

  // Replace with fallback support {{field|fallback}}
  result = result.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, field, fallback) => {
    return contact[field] || fallback;
  });

  // Replace simple merge tags
  result = result.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    // Check direct field match first
    if (contact[field] !== undefined && contact[field] !== null) {
      return String(contact[field]);
    }
    
    // Check case-insensitive match
    const fieldLower = field.toLowerCase();
    const contactKey = Object.keys(contact).find(key => key.toLowerCase() === fieldLower);
    if (contactKey && contact[contactKey] !== undefined && contact[contactKey] !== null) {
      return String(contact[contactKey]);
    }
    
    // Legacy field mappings
    if (field === 'firstName' || field === 'first_name') {
      return contact.first_name || contact.firstName || fallbackTags.first_name;
    }
    if (field === 'lastName' || field === 'last_name') {
      return contact.last_name || contact.lastName || '';
    }
    if (field === 'company') {
      return contact.company || fallbackTags.company;
    }
    
    // Return the tag unchanged if no match found
    return match;
  });

  return result;
}

serve(handler);
