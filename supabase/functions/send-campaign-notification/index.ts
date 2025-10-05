import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignNotificationRequest {
  campaignName: string;
  campaignId: string;
  launchDate: string;
  emailCount: number;
  notificationEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      campaignName, 
      campaignId, 
      launchDate, 
      emailCount, 
      notificationEmail 
    }: CampaignNotificationRequest = await req.json();

    console.log('📧 Sending campaign notification to:', notificationEmail);

    const launchDateTime = new Date(launchDate);
    const formattedDate = launchDateTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = launchDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const { data, error } = await resend.emails.send({
      from: 'Campaign Notifications <onboarding@resend.dev>',
      to: [notificationEmail],
      subject: `🚀 Campaign "${campaignName}" Launched`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: #f9fafb;
                border-radius: 8px;
                padding: 30px;
                border: 1px solid #e5e7eb;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
                margin: -30px -30px 20px -30px;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .detail-row:last-child {
                border-bottom: none;
              }
              .detail-label {
                font-weight: 600;
                color: #6b7280;
              }
              .detail-value {
                color: #111827;
                font-weight: 500;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                margin-top: 30px;
              }
              .emoji {
                font-size: 48px;
                text-align: center;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Campaign Launched</h1>
              </div>
              
              <div class="emoji">📨</div>
              
              <p>Great news! Your campaign has been successfully launched and emails are being sent.</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Campaign Name:</span>
                  <span class="detail-value">${campaignName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign ID:</span>
                  <span class="detail-value">${campaignId.slice(0, 8)}...</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Launch Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Launch Time:</span>
                  <span class="detail-value">${formattedTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Emails:</span>
                  <span class="detail-value">${emailCount.toLocaleString()}</span>
                </div>
              </div>
              
              <p>You can monitor the campaign's progress in your dashboard.</p>
              
              <div class="footer">
                <p>This is an automated notification from your email campaign system.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send notification:', error);
      throw error;
    }

    console.log('✅ Campaign notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-campaign-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});