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
    console.log("🧪 Testing campaign email insert...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get a test campaign and contact
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .limit(1);

    if (campaignError || !campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No campaigns found for testing",
        details: campaignError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, user_id')
      .eq('user_id', campaigns[0].user_id)
      .limit(1);

    if (contactError || !contacts || contacts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No contacts found for testing",
        details: contactError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: senderAccounts, error: senderError } = await supabase
      .from('sender_accounts')
      .select('id, user_id')
      .eq('user_id', campaigns[0].user_id)
      .limit(1);

    if (senderError || !senderAccounts || senderAccounts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No sender accounts found for testing",
        details: senderError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Test inserting a campaign email record
    const { data: emailSendRecord, error: insertError } = await supabase
      .from("email_sends")
      .insert({
        campaign_id: campaigns[0].id,
        contact_id: contacts[0].id,
        sequence_id: null, // Can be null for first email
        sender_account_id: senderAccounts[0].id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to insert campaign email record",
        details: insertError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Test updating the record
    const { error: updateError } = await supabase
      .from("email_sends")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        message_id: `<test-${emailSendRecord.id}@example.com>`
      })
      .eq("id", emailSendRecord.id);

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to update campaign email record",
        details: updateError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Test selecting the record
    const { data: selectedRecord, error: selectError } = await supabase
      .from("email_sends")
      .select("*")
      .eq("id", emailSendRecord.id)
      .single();

    if (selectError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to select campaign email record",
        details: selectError
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Clean up test record
    await supabase
      .from("email_sends")
      .delete()
      .eq("id", emailSendRecord.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Campaign email operations work correctly",
      testRecord: selectedRecord
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Test error:", error);
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
