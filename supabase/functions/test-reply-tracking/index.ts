import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestReplyRequest {
  contactEmail: string;
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactEmail, campaignId }: TestReplyRequest = await req.json();
    console.log("Testing reply tracking for:", contactEmail, "Campaign:", campaignId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Check if contact exists
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, replied_at, campaign_id, first_name, last_name')
      .eq('email', contactEmail.toLowerCase())
      .eq('campaign_id', campaignId);

    console.log("Contact query result:", { contacts, contactError });

    // Test 2: Check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('id', campaignId)
      .single();

    console.log("Campaign query result:", { campaign, campaignError });

    // Test 3: Test the mark_contact_replied function
    let rpcResult = null;
    let rpcError = null;
    
    if (contacts && contacts.length > 0) {
      const { data, error } = await supabase
        .rpc('mark_contact_replied', {
          contact_email: contactEmail.toLowerCase(),
          campaign_id_param: campaignId
        });
      
      rpcResult = data;
      rpcError = error;
      console.log("RPC call result:", { data, error });
    }

    // Test 4: Check contact status after RPC call
    const { data: updatedContacts, error: updatedError } = await supabase
      .from('contacts')
      .select('id, email, replied_at, campaign_id')
      .eq('email', contactEmail.toLowerCase())
      .eq('campaign_id', campaignId);

    console.log("Updated contact status:", { updatedContacts, updatedError });

    return new Response(JSON.stringify({
      success: true,
      tests: {
        contactExists: {
          found: contacts && contacts.length > 0,
          count: contacts?.length || 0,
          contacts: contacts || [],
          error: contactError
        },
        campaignExists: {
          found: !!campaign,
          campaign: campaign,
          error: campaignError
        },
        rpcCall: {
          result: rpcResult,
          error: rpcError
        },
        finalStatus: {
          contacts: updatedContacts || [],
          error: updatedError
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in test-reply-tracking function:", error);
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
