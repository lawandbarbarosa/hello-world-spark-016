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

interface SendEmailRequest {
  campaignId: string;
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

    // Check time window with proper timezone handling
    const userTimezone = userSettings?.timezone || 'UTC';
    const now = new Date();
    const zonedTime = toZonedTime(now, userTimezone);
    const currentTime = format(zonedTime, 'HH:mm', { timeZone: userTimezone });
    
    const startTime = userSettings?.send_time_start || '08:00';
    const endTime = userSettings?.send_time_end || '18:00';

    console.log(`Time check - Current: ${currentTime}, Window: ${startTime} - ${endTime}, Timezone: ${userTimezone}`);

    if (currentTime < startTime || currentTime > endTime) {
      console.log(`Send blocked: Current time ${currentTime} outside allowed window ${startTime}-${endTime} in ${userTimezone}`);
      return new Response(JSON.stringify({ 
        error: `Sending is only allowed between ${startTime} and ${endTime} in ${userTimezone} timezone. Current time: ${currentTime}` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Get contacts for the campaign with detailed logging
    console.log("Fetching contacts for campaign:", campaignId);
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "active");

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

    // Check total daily limit across all sender accounts for this user
    const todayStart = new Date(zonedTime.getFullYear(), zonedTime.getMonth(), zonedTime.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const { count: totalDailyCount, error: totalCountError } = await supabase
      .from('email_sends')
      .select('sender_account_id', { count: 'exact', head: true })
      .in('sender_account_id', senderAccounts.map(s => s.id))
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .in('status', ['sent', 'pending']);

    const dailyLimit = userSettings?.daily_send_limit || 50;
    const totalSentToday = totalCountError ? 0 : (totalDailyCount || 0);
    const remainingLimit = Math.max(0, dailyLimit - totalSentToday);

    if (remainingLimit === 0) {
      console.log(`Daily limit reached: ${totalSentToday}/${dailyLimit} emails sent today`);
      return new Response(JSON.stringify({ 
        error: `Daily sending limit of ${dailyLimit} emails reached. Total sent today: ${totalSentToday}. Try again tomorrow or increase your daily limit in settings.`
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit contacts to remaining daily capacity
    const contactsToProcess = contacts.slice(0, remainingLimit);
    console.log(`Processing ${contactsToProcess.length} contacts (${remainingLimit} remaining in daily limit)`);

    // All sender accounts are available since we're using total daily limit
    const availableSenders = senderAccounts;

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

     // Send emails to contacts using round-robin across senders, respecting total daily limit
    for (const contact of contactsToProcess) {
      // Use round-robin to distribute across available senders
      const currentSender = availableSenders[senderIndex % availableSenders.length];
      senderIndex++;

      try {
        // Get fallback merge tags from user settings
        const fallbackTags = userSettings?.fallback_merge_tags || { first_name: 'there', company: 'your company' };
        
        // Replace merge tags with fallback support
        let personalizedSubject = firstSequence.subject;
        let personalizedBody = firstSequence.body;

        // Replace with fallback support {{field|fallback}}
        personalizedSubject = personalizedSubject.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, field, fallback) => {
          return contact[field] || fallback;
        });
        personalizedBody = personalizedBody.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, field, fallback) => {
          return contact[field] || fallback;
        });

        // Replace simple merge tags with fallback from settings
        personalizedSubject = personalizedSubject.replace(/\{\{(\w+)\}\}/g, (match, field) => {
          if (field === 'first_name' || field === 'firstName') {
            return contact.first_name || fallbackTags.first_name;
          }
          if (field === 'company') {
            return contact.company || fallbackTags.company;
          }
          return contact[field] || contact[field.toLowerCase()] || match;
        });

        personalizedBody = personalizedBody.replace(/\{\{(\w+)\}\}/g, (match, field) => {
          if (field === 'first_name' || field === 'firstName') {
            return contact.first_name || fallbackTags.first_name;
          }
          if (field === 'company') {
            return contact.company || fallbackTags.company;
          }
          return contact[field] || contact[field.toLowerCase()] || match;
        });

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

        // Format email body with user settings
        let finalBody = personalizedBody;

        // Add signature if provided
        if (userSettings?.default_signature && userSettings.default_signature.trim()) {
          finalBody += '\n\n' + userSettings.default_signature;
        }

        // Add unsubscribe link if enabled
        if (userSettings?.unsubscribe_link_enabled !== false) {
          const unsubscribeUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${insertedEmailSend.id}&action=unsubscribe`;
          finalBody += '\n\n---\n';
          finalBody += `If you no longer wish to receive these emails, you can [unsubscribe here](${unsubscribeUrl}).`;
        }

        // Add legal disclaimer if provided
        if (userSettings?.legal_disclaimer && userSettings.legal_disclaimer.trim()) {
          finalBody += '\n\n' + userSettings.legal_disclaimer;
        }

        // Add tracking pixel to email body with the email send ID
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${insertedEmailSend.id}" width="1" height="1" style="display:none;" alt="" />`;
        const emailBodyWithTracking = finalBody.replace(/\n/g, '<br>') + trackingPixel;

        // Send email using Resend with current sender
        console.log(`Attempting to send email to ${contact.email} from ${currentSender.email} (${currentSender.remaining} remaining capacity)`);
        
        const emailResponse = await resend.emails.send({
          from: `${currentSender.email}`,
          to: [contact.email],
          subject: personalizedSubject,
          html: emailBodyWithTracking,
        });

        console.log("Resend API response:", emailResponse);

        if (emailResponse.error) {
          console.error("Email send error for", contact.email, ":", emailResponse.error);
          emailsError++;
          
          // Update the email send record with failed status
          await supabase
            .from("email_sends")
            .update({
              status: "failed",
              error_message: JSON.stringify(emailResponse.error),
            })
            .eq("id", insertedEmailSend.id);
        } else {
          console.log("Email sent successfully to", contact.email, "with ID:", emailResponse.data?.id);
          emailsSent++;
          
          // Update the email send record with sent status
          await supabase
            .from("email_sends")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", insertedEmailSend.id);

          // Update sender's remaining capacity
          currentSender.remaining--;
        }

        // Move to next sender for round-robin distribution
        senderIndex = (senderIndex + 1) % availableSenders.length;
        
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
            error_message: error.message,
          });
        }
      }
    }

    // Update campaign status to launched
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    const message = availableSenders.length < senderStatuses.length 
      ? `Campaign launched with ${emailsSent} emails sent. ${senderStatuses.length - availableSenders.length} sender(s) reached daily limit.`
      : `Campaign launched successfully. Sent ${emailsSent} emails across ${availableSenders.length} sender account(s).`;

    console.log(`Campaign ${campaignId} processed: ${emailsSent} sent, ${emailsError} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      emailsError,
      message,
      senderStats: senderStatuses.map(s => ({
        email: s.email,
        sentToday: s.sentToday,
        remaining: s.remaining,
        limit: userSettings?.daily_send_limit || 50
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-campaign-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);