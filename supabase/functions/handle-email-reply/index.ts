import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReplyData {
  fromEmail: string;
  toEmail: string;
  campaignId?: string;
  subject?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const replyData: ReplyData = await req.json();
    console.log('Processing email reply:', replyData);

    const { fromEmail, toEmail, campaignId, subject, messageId, inReplyTo, references } = replyData;

    if (!fromEmail || !toEmail) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: fromEmail and toEmail' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let matchedCampaignId = campaignId;
    let contactEmail = fromEmail.toLowerCase();

    // If no campaign ID provided, try to match based on sender account email
    if (!matchedCampaignId) {
      console.log('No campaign ID provided, trying to match sender account...');
      
      // Find sender account by email
      const { data: senderAccount, error: senderError } = await supabase
        .from('sender_accounts')
        .select('campaign_id, user_id')
        .eq('email', toEmail.toLowerCase())
        .single();

      if (senderError || !senderAccount) {
        console.log('No sender account found for email:', toEmail);
        
        // Try to match based on subject line or other criteria
        // Look for campaigns with emails sent to this contact
        const { data: emailSends, error: emailSendsError } = await supabase
          .from('email_sends')
          .select(`
            campaign_id,
            contacts!inner(email, user_id)
          `)
          .eq('contacts.email', contactEmail)
          .order('created_at', { ascending: false })
          .limit(1);

        if (emailSendsError || !emailSends || emailSends.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'Could not match reply to any campaign',
            details: 'No matching sender account or recent emails found'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        matchedCampaignId = emailSends[0].campaign_id;
        console.log('Matched campaign via email sends:', matchedCampaignId);
      } else {
        matchedCampaignId = senderAccount.campaign_id;
        console.log('Matched campaign via sender account:', matchedCampaignId);
      }
    }

    // If still no campaign ID, return error
    if (!matchedCampaignId) {
      return new Response(JSON.stringify({ 
        error: 'Could not determine campaign ID for this reply' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if contact exists and hasn't already replied
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, replied_at, campaign_id')
      .eq('email', contactEmail)
      .eq('campaign_id', matchedCampaignId)
      .single();

    if (contactError || !contact) {
      console.log('Contact not found:', contactEmail, 'Campaign:', matchedCampaignId);
      return new Response(JSON.stringify({ 
        error: 'Contact not found in the specified campaign',
        contactEmail,
        campaignId: matchedCampaignId
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already marked as replied
    if (contact.replied_at) {
      console.log('Contact already marked as replied:', contactEmail);
      return new Response(JSON.stringify({ 
        message: 'Contact was already marked as replied',
        contactEmail,
        repliedAt: contact.replied_at
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark contact as replied using the database function
    const { error: markReplyError } = await supabase
      .rpc('mark_contact_replied', {
        contact_email: contactEmail,
        campaign_id_param: matchedCampaignId
      });

    if (markReplyError) {
      console.error('Error marking contact as replied:', markReplyError);
      return new Response(JSON.stringify({ 
        error: 'Failed to mark contact as replied',
        details: markReplyError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully marked contact as replied:', contactEmail, 'Campaign:', matchedCampaignId);

    // Log the reply for audit purposes
    const replyLogData = {
      contact_id: contact.id,
      campaign_id: matchedCampaignId,
      from_email: fromEmail,
      to_email: toEmail,
      subject: subject || 'No subject',
      message_id: messageId,
      in_reply_to: inReplyTo,
      references: references,
      processed_at: new Date().toISOString()
    };

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Reply processed successfully',
      contactEmail,
      campaignId: matchedCampaignId,
      repliedAt: new Date().toISOString(),
      replyData: replyLogData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error processing reply:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);