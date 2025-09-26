import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailSyncRequest {
  emailSendId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailSendId, senderEmail, recipientEmail, subject, body, sentAt }: GmailSyncRequest = await req.json();
    
    console.log("Syncing email to Gmail Sent folder:", {
      emailSendId,
      senderEmail,
      recipientEmail,
      subject: subject.substring(0, 50) + "...",
      bodyLength: body.length
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sender account details to check if Gmail sync is enabled
    const { data: senderAccount, error: senderError } = await supabase
      .from('sender_accounts')
      .select('id, email, provider, gmail_sync_enabled, gmail_refresh_token')
      .eq('email', senderEmail)
      .single();

    if (senderError || !senderAccount) {
      console.log("Sender account not found or no Gmail sync configured:", senderEmail);
      return new Response(JSON.stringify({ 
        success: false,
        message: "Gmail sync not configured for this sender account",
        senderEmail
      }), {
        status: 200, // Not an error, just not configured
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if Gmail sync is enabled for this sender
    if (!senderAccount.gmail_sync_enabled || !senderAccount.gmail_refresh_token) {
      console.log("Gmail sync not enabled for sender:", senderEmail, {
        gmail_sync_enabled: senderAccount.gmail_sync_enabled,
        has_refresh_token: !!senderAccount.gmail_refresh_token
      });
      return new Response(JSON.stringify({ 
        success: false,
        message: "Gmail sync not enabled for this sender account",
        senderEmail
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if Gmail API credentials are configured
    const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');
    const gmailClientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
    
    if (!gmailClientId || !gmailClientSecret) {
      console.error("Gmail API credentials not configured:", {
        hasClientId: !!gmailClientId,
        hasClientSecret: !!gmailClientSecret
      });
      return new Response(JSON.stringify({ 
        success: false,
        message: "Gmail API credentials not configured",
        senderEmail
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the email message in Gmail format
    const emailMessage = createGmailMessage({
      to: recipientEmail,
      from: senderEmail,
      subject: subject,
      body: body,
      sentAt: sentAt
    });

    // Sync to Gmail using the Gmail API
    const syncResult = await syncToGmail({
      refreshToken: senderAccount.gmail_refresh_token,
      message: emailMessage,
      senderEmail: senderEmail
    });

    if (syncResult.success) {
      // Update the email_sends record to mark as synced
      await supabase
        .from('email_sends')
        .update({ 
          gmail_synced: true,
          gmail_message_id: syncResult.messageId,
          gmail_synced_at: new Date().toISOString()
        })
        .eq('id', emailSendId);

      console.log("Successfully synced email to Gmail:", syncResult.messageId);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "Email synced to Gmail Sent folder",
        gmailMessageId: syncResult.messageId,
        senderEmail,
        recipientEmail
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      console.error("Failed to sync to Gmail:", syncResult.error);
      
      return new Response(JSON.stringify({ 
        success: false,
        message: "Failed to sync email to Gmail",
        error: syncResult.error,
        senderEmail
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: any) {
    console.error("Error in sync-to-gmail-sent function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

// Helper function to create Gmail message format
function createGmailMessage({ to, from, subject, body, sentAt }: {
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
}) {
  const date = new Date(sentAt).toUTCString();
  
  // Create RFC 2822 formatted email
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    body
  ].join('\r\n');

  // Base64 encode the message
  return btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper function to sync to Gmail using Gmail API
async function syncToGmail({ refreshToken, message, senderEmail }: {
  refreshToken: string;
  message: string;
  senderEmail: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
        client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Failed to get access token:', error);
      return { success: false, error: 'Failed to get Gmail access token' };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Insert email into Gmail Sent folder using Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: message,
        labelIds: ['SENT'] // Explicitly add to Sent folder
      }),
    });

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      console.error('Failed to insert email into Gmail Sent folder:', error);
      console.error('Gmail API response status:', gmailResponse.status);
      return { success: false, error: `Failed to insert email into Gmail Sent folder: ${error}` };
    }

    const gmailData = await gmailResponse.json();
    return { success: true, messageId: gmailData.id };

  } catch (error) {
    console.error('Error syncing to Gmail:', error);
    return { success: false, error: (error as Error).message };
  }
}

serve(handler);
