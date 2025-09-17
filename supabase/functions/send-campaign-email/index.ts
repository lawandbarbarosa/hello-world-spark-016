import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@2.0.0";

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

    // Check time window (use settings or defaults)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const startTime = userSettings?.send_time_start || '08:00';
    const endTime = userSettings?.send_time_end || '18:00';

    if (currentTime < startTime || currentTime > endTime) {
      console.log(`Send blocked: Current time ${currentTime} outside allowed window ${startTime}-${endTime}`);
      return new Response(JSON.stringify({ 
        error: `Sending is only allowed between ${startTime} and ${endTime}. Current time: ${currentTime}` 
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
    const senderIndex = 0; // Start with first sender account

    // Send emails to all contacts
    for (const contact of contacts) {
      try {
        const senderAccount = senderAccounts[senderIndex % senderAccounts.length];
        
        // Check daily limit for this sender account
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const { count: dailyCount, error: countError } = await supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .eq('sender_account_id', senderAccount.id)
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString());

        const dailyLimit = userSettings?.daily_send_limit || 50;
        if ((dailyCount || 0) >= dailyLimit) {
          console.log(`Daily limit reached for sender ${senderAccount.email}: ${dailyCount}/${dailyLimit}`);
          emailsError++;
          continue;
        }

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

        // First create the email send record to get the ID for tracking
        const { data: insertedEmailSend, error: insertError } = await supabase
          .from("email_sends")
          .insert({
            campaign_id: campaignId,
            contact_id: contact.id,
            sequence_id: firstSequence.id,
            sender_account_id: senderAccount.id,
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

        // Send email using Resend with tracking pixel
        console.log(`Attempting to send email to ${contact.email} with subject: "${personalizedSubject}"`);
        
        const emailResponse = await resend.emails.send({
          from: `${senderAccount.email}`, // Use the actual sender account email
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
        }
      } catch (error) {
        console.error("Error sending email to contact:", contact.email, error);
        emailsError++;
        
        // Record failed email send
        const senderAccount = senderAccounts[senderIndex % senderAccounts.length];
        await supabase.from("email_sends").insert({
          campaign_id: campaignId,
          contact_id: contact.id,
          sequence_id: firstSequence.id,
          sender_account_id: senderAccount.id,
          status: "failed",
          error_message: error.message,
        });
      }
    }

    // Update campaign status to launched
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    console.log(`Campaign ${campaignId} processed: ${emailsSent} sent, ${emailsError} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      emailsError,
      message: `Campaign launched successfully. Sent ${emailsSent} emails.`
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