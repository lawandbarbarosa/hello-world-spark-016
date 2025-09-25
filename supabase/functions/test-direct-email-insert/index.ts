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
    console.log("🧪 Testing direct email insert...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test inserting a direct email record
    const { data: emailSendRecord, error: insertError } = await supabase
      .from("email_sends")
      .insert({
        campaign_id: null, // Direct email, not part of a campaign
        contact_id: null, // Direct email, not from contact list
        sequence_id: null, // Direct email, not part of sequence
        sender_account_id: null, // Direct email, not from configured account
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
          details: insertError,
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Insert successful:", emailSendRecord);

    // Test updating the record
    const { error: updateError } = await supabase
      .from("email_sends")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailSendRecord.id);

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: updateError.message,
          details: updateError,
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Update successful");

    // Test selecting the record
    const { data: selectData, error: selectError } = await supabase
      .from("email_sends")
      .select("*")
      .eq("id", emailSendRecord.id)
      .single();

    if (selectError) {
      console.error("❌ Select error:", selectError);
      return new Response(
        JSON.stringify({
          success: false,
          error: selectError.message,
          details: selectError,
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Select successful:", selectData);

    // Clean up - delete the test record
    const { error: deleteError } = await supabase
      .from("email_sends")
      .delete()
      .eq("id", emailSendRecord.id);

    if (deleteError) {
      console.error("❌ Delete error:", deleteError);
    } else {
      console.log("✅ Delete successful");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "All direct email operations successful",
        testRecord: emailSendRecord,
        result: 'success'
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("❌ Error in test function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        result: 'error'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
