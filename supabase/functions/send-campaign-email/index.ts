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

// Helper function to schedule follow-up emails
async function scheduleFollowUpEmails(
  supabase: any,
  campaignId: string,
  contactId: string,
  senderAccountId: string,
  sequences: any[],
  userTimezone: string
) {
  try {
    // Get follow-up sequences (skip step 1 as it's already sent)
    const followUpSequences = sequences.filter(seq => seq.step_number > 1);
    
    if (followUpSequences.length === 0) {
      console.log("No follow-up sequences to schedule");
      return;
    }

    const now = new Date();
    let previousEmailTime = now;

    for (const sequence of followUpSequences) {
      // Calculate when this email should be sent based on delay
      const delayInMinutes = calculateDelayInMinutes(sequence.delay_amount, sequence.delay_unit);
      const scheduledTime = new Date(previousEmailTime.getTime() + delayInMinutes * 60 * 1000);

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
        console.log(`Scheduled follow-up email ${sequence.step_number} for ${scheduledTime.toISOString()}`);
      }

      // Update previous email time for next iteration
      previousEmailTime = scheduledTime;
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
    const todayStart = new Date(zonedTime.getFullYear(), zonedTime.getMonth(), zonedTime.getDate());
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
      let attempts = 0;
      
      // Try to find a sender with remaining capacity (round-robin with capacity check)
      while (attempts < availableSenders.length) {
        const candidateSender = availableSenders[senderIndex % availableSenders.length];
        if (candidateSender.remainingCapacity > 0) {
          currentSender = candidateSender;
          break;
        }
        senderIndex = (senderIndex + 1) % availableSenders.length;
        attempts++;
      }

      // If no sender has capacity, break the loop
      if (!currentSender) {
        console.log("No more senders with remaining capacity");
        break;
      }

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

        // Replace simple merge tags with dynamic field matching
        personalizedSubject = personalizedSubject.replace(/\{\{(\w+)\}\}/g, (match, field) => {
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
          
          // Legacy field mappings for backward compatibility
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

        personalizedBody = personalizedBody.replace(/\{\{(\w+)\}\}/g, (match, field) => {
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
          
          // Legacy field mappings for backward compatibility
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

        // Unsubscribe link removed per user request

        // Add legal disclaimer if provided
        if (userSettings?.legal_disclaimer && userSettings.legal_disclaimer.trim()) {
          finalBody += '\n\n' + userSettings.legal_disclaimer;
        }

        // Add tracking pixel to email body with the email send ID
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-open?id=${insertedEmailSend.id}" width="1" height="1" style="display:none;" alt="" />`;
        const emailBodyWithTracking = finalBody.replace(/\n/g, '<br>') + trackingPixel;

        // Send email using Resend with current sender
        console.log(`Attempting to send email to ${contact.email} from ${currentSender.email} (${currentSender.remainingCapacity} remaining capacity)`);
        
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
          currentSender.remainingCapacity--;

          // Schedule follow-up emails for the remaining sequences
          await scheduleFollowUpEmails(supabase, campaignId, contact.id, currentSender.id, sequences, userTimezone);
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);