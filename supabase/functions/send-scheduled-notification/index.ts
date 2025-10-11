import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledNotificationRequest {
  notificationEmail: string;
  campaignName: string;
  contactEmail: string;
  sequenceStep: number;
  subject: string;
  sentAt: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      notificationEmail,
      campaignName,
      contactEmail,
      sequenceStep,
      subject,
      sentAt,
    }: ScheduledNotificationRequest = await req.json();

    console.log(`📧 Sending scheduled email notification to: ${notificationEmail}`);

    const sentTime = new Date(sentAt);
    const formattedTime = sentTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const emailResponse = await resend.emails.send({
      from: "Campaign Alerts <onboarding@resend.dev>",
      to: [notificationEmail],
      subject: `📧 Scheduled Email Sent - ${campaignName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scheduled Email Sent</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📧 Scheduled Email Sent</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">A scheduled follow-up email was just sent from your campaign!</p>
              
              <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #667eea; width: 140px;">Campaign:</td>
                    <td style="padding: 8px 0;">${campaignName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #667eea;">Recipient:</td>
                    <td style="padding: 8px 0;">${contactEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #667eea;">Follow-up Step:</td>
                    <td style="padding: 8px 0;">Step ${sequenceStep}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #667eea;">Subject:</td>
                    <td style="padding: 8px 0;">${subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #667eea;">Sent At:</td>
                    <td style="padding: 8px 0;">${formattedTime}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This email was automatically sent based on your campaign's schedule. You can manage your notification preferences in your account settings.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>You're receiving this because you enabled scheduled email notifications in your settings.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("❌ Failed to send notification:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Scheduled email notification sent successfully:", emailResponse.data);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse.data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-scheduled-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
