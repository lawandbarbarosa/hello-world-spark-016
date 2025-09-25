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

    const { to, from, subject, html, directEmailId } = await req.json();

    if (!to || !from || !subject || !html || !directEmailId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, from, subject, html, directEmailId",
          result: 'error'
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📤 Sending email from ${from} to ${to}`);
    console.log(`📝 Subject: ${subject}`);

    // Generate unique Message-ID for reply tracking
    const messageId = `<${directEmailId}@${from.split('@')[1]}>`;
    console.log(`📧 Generated Message-ID: ${messageId}`);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: from,
      to: [to],
      subject: subject,
      html: html,
      headers: {
        'Message-ID': messageId,
        'X-Direct-Email-ID': directEmailId
      }
    });

    if (emailResponse.error) {
      console.error("❌ Email send error:", emailResponse.error);
      
      // Update email send record with error and categorize the failure
      if (emailSendId) {
        const { error: updateError } = await supabase
          .rpc('update_email_failure_details', {
            email_send_id_param: emailSendId,
            error_message_param: JSON.stringify(emailResponse.error),
            status_param: 'failed'
          });

        if (updateError) {
          console.error('Error updating email failure details:', updateError);
          // Fallback to basic update if categorization fails
          await supabase
            .from("email_sends")
            .update({
              status: "failed",
              error_message: JSON.stringify(emailResponse.error),
            })
            .eq("id", emailSendId);
        }
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

    // Update direct email record with success and Message-ID
    if (directEmailId) {
      await supabase
        .from("direct_emails")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id: messageId
        })
        .eq("id", directEmailId);
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
