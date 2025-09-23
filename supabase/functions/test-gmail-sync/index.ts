import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all sender accounts with Gmail sync status
    const { data: senderAccounts, error: senderError } = await supabase
      .from('sender_accounts')
      .select('id, email, provider, gmail_sync_enabled, gmail_refresh_token, created_at')
      .order('email');

    if (senderError) {
      throw senderError;
    }

    // Check Gmail API credentials
    const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');
    const gmailClientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
    
    const credentialsStatus = {
      hasClientId: !!gmailClientId,
      hasClientSecret: !!gmailClientSecret,
      clientIdPreview: gmailClientId ? `${gmailClientId.substring(0, 10)}...` : 'Not set'
    };

    // Get recent email sends with Gmail sync status
    const { data: recentEmails, error: emailsError } = await supabase
      .from('email_sends')
      .select(`
        id,
        status,
        sent_at,
        gmail_synced,
        gmail_message_id,
        gmail_synced_at,
        sender_accounts!inner(email),
        contacts!inner(email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (emailsError) {
      console.warn('Error fetching recent emails:', emailsError);
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      gmailCredentials: credentialsStatus,
      senderAccounts: senderAccounts?.map(account => ({
        id: account.id,
        email: account.email,
        provider: account.provider,
        gmailSyncEnabled: account.gmail_sync_enabled,
        hasRefreshToken: !!account.gmail_refresh_token,
        created: account.created_at
      })) || [],
      recentEmails: recentEmails?.map(email => ({
        id: email.id,
        status: email.status,
        sentAt: email.sent_at,
        gmailSynced: email.gmail_synced,
        gmailMessageId: email.gmail_message_id,
        gmailSyncedAt: email.gmail_synced_at,
        senderEmail: email.sender_accounts?.email,
        recipientEmail: email.contacts?.email
      })) || [],
      summary: {
        totalSenderAccounts: senderAccounts?.length || 0,
        gmailSyncEnabledAccounts: senderAccounts?.filter(acc => acc.gmail_sync_enabled).length || 0,
        accountsWithTokens: senderAccounts?.filter(acc => acc.gmail_refresh_token).length || 0,
        recentEmailsCount: recentEmails?.length || 0,
        syncedEmailsCount: recentEmails?.filter(email => email.gmail_synced).length || 0
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in test-gmail-sync function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
