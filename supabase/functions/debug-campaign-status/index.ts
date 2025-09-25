import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 Debugging campaign status...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({
        success: false,
        error: "campaignId is required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Campaign not found",
        details: campaignError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get contacts for this campaign
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId);

    // Get email sends for this campaign
    const { data: emailSends, error: emailSendsError } = await supabase
      .from('email_sends')
      .select('*')
      .eq('campaign_id', campaignId);

    // Get scheduled emails for this campaign
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaignId);

    // Get email sequences for this campaign
    const { data: sequences, error: sequencesError } = await supabase
      .from('email_sequences')
      .select('*')
      .eq('campaign_id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        created_at: campaign.created_at
      },
      contacts: {
        total: contacts?.length || 0,
        data: contacts || []
      },
      emailSends: {
        total: emailSends?.length || 0,
        sent: emailSends?.filter(e => e.status === 'sent').length || 0,
        pending: emailSends?.filter(e => e.status === 'pending').length || 0,
        failed: emailSends?.filter(e => e.status === 'failed').length || 0,
        data: emailSends || []
      },
      scheduledEmails: {
        total: scheduledEmails?.length || 0,
        scheduled: scheduledEmails?.filter(e => e.status === 'scheduled').length || 0,
        sent: scheduledEmails?.filter(e => e.status === 'sent').length || 0,
        failed: scheduledEmails?.filter(e => e.status === 'failed').length || 0,
        data: scheduledEmails || []
      },
      sequences: {
        total: sequences?.length || 0,
        data: sequences || []
      },
      errors: {
        contacts: contactsError,
        emailSends: emailSendsError,
        scheduled: scheduledError,
        sequences: sequencesError
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Debug error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
