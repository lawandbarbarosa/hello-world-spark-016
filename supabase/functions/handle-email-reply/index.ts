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
  content?: string;
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

    const { fromEmail, toEmail, campaignId, subject, content, messageId, inReplyTo, references } = replyData;

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
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, replied_at, campaign_id')
      .eq('email', contactEmail)
      .eq('campaign_id', matchedCampaignId);
    
    const contact = contacts?.[0]; // Get the first match

    if (contactError) {
      console.error('Error querying contacts:', contactError);
      return new Response(JSON.stringify({ 
        error: 'Database error while looking up contact',
        details: contactError.message,
        contactEmail,
        campaignId: matchedCampaignId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contact) {
      console.log('Contact not found:', contactEmail, 'Campaign:', matchedCampaignId);
      console.log('Available contacts for this email:', contacts?.length || 0);
      return new Response(JSON.stringify({ 
        error: 'Contact not found in the specified campaign',
        contactEmail,
        campaignId: matchedCampaignId,
        debug: {
          totalContactsFound: contacts?.length || 0,
          contacts: contacts?.map(c => ({ id: c.id, email: c.email, campaign_id: c.campaign_id })) || []
        }
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
      console.error('RPC call details:', {
        contact_email: contactEmail,
        campaign_id_param: matchedCampaignId,
        contact_id: contact.id
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to mark contact as replied',
        details: markReplyError.message,
        debug: {
          contact_email: contactEmail,
          campaign_id_param: matchedCampaignId,
          contact_id: contact.id
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully marked contact as replied:', contactEmail, 'Campaign:', matchedCampaignId);

    // Store the reply content in the email_replies table
    let replyId = null;
    if (content) {
      try {
        // Try to find the original email_send_id if possible
        let emailSendId = null;
        if (inReplyTo || references) {
          // Extract Message-ID from In-Reply-To or References header
          const messageIdToSearch = inReplyTo || references;
          console.log('Searching for original email with Message-ID:', messageIdToSearch);
          
          // Look for the original email send based on message ID
          const { data: originalEmailSend, error: emailSendError } = await supabase
            .from('email_sends')
            .select('id, campaign_id, contact_id')
            .eq('message_id', messageIdToSearch)
            .single();
          
          if (originalEmailSend) {
            emailSendId = originalEmailSend.id;
            console.log('Found original email send:', emailSendId);
          } else {
            console.log('No original email send found for Message-ID:', messageIdToSearch, 'Error:', emailSendError);
            // Fallback: find the most recent email send for this contact and campaign
            const { data: fallbackEmailSend } = await supabase
              .from('email_sends')
              .select('id')
              .eq('contact_id', contact.id)
              .eq('campaign_id', matchedCampaignId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            emailSendId = fallbackEmailSend?.[0]?.id || null;
            console.log('Using fallback email send:', emailSendId);
          }
        }

        // Store the reply using the database function
        const { data: storedReplyId, error: storeReplyError } = await supabase
          .rpc('store_email_reply', {
            contact_email_param: contactEmail,
            campaign_id_param: matchedCampaignId,
            from_email_param: fromEmail,
            to_email_param: toEmail,
            subject_param: subject || 'No subject',
            content_param: content,
            message_id_param: messageId,
            in_reply_to_param: inReplyTo,
            references_param: references,
            email_send_id_param: emailSendId
          });

        if (storeReplyError) {
          console.error('Error storing reply content:', storeReplyError);
          // Don't fail the entire operation if reply storage fails
        } else {
          replyId = storedReplyId;
          console.log('Successfully stored reply content with ID:', replyId);
        }
      } catch (error) {
        console.error('Error storing reply content:', error);
        // Don't fail the entire operation if reply storage fails
      }
    }

    // Log the reply for audit purposes
    const replyLogData = {
      contact_id: contact.id,
      campaign_id: matchedCampaignId,
      from_email: fromEmail,
      to_email: toEmail,
      subject: subject || 'No subject',
      content: content || 'No content provided',
      message_id: messageId,
      in_reply_to: inReplyTo,
      references: references,
      reply_id: replyId,
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