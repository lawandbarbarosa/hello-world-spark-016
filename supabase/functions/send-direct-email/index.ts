import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@2.0.0";

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 Starting direct email send...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, from, subject, html, emailSendId } = await req.json();

    if (!to || !from || !subject || !html) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, from, subject, html",
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📤 Sending email from ${from} to ${to}`);
    console.log(`📝 Subject: ${subject}`);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: from,
      to: [to],
      subject: subject,
      html: html,
    });

    if (emailResponse.error) {
      console.error("❌ Email send error:", emailResponse.error);
      
      // Update email send record with error
      if (emailSendId) {
        await supabase
          .from("email_sends")
          .update({
            status: "failed",
            error_message: JSON.stringify(emailResponse.error),
          })
          .eq("id", emailSendId);
      }

      return new Response(
        JSON.stringify({
          error: emailResponse.error,
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Email sent successfully:", emailResponse.data?.id);

    // Update email send record with success
    if (emailSendId) {
      await supabase
        .from("email_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailSendId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: emailResponse.data?.id,
        result: 'success'
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("❌ Error in send-direct-email function:", error);
    return new Response(
      JSON.stringify({
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
