import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenNotificationRequest {
  contactEmail: string;
  campaignName: string;
  openedAt: string;
  notificationEmail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contactEmail, 
      campaignName, 
      openedAt, 
      notificationEmail 
    }: OpenNotificationRequest = await req.json();

    console.log('📧 Sending email open notification to:', notificationEmail);

    const openDateTime = new Date(openedAt);
    const formattedDate = openDateTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = openDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const { data, error } = await resend.emails.send({
      from: 'Email Tracking <onboarding@resend.dev>',
      to: [notificationEmail],
      subject: `👀 Email Opened: ${campaignName}`,
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                <h1>👀 Email Opened</h1>
              </div>
              
              <div class="emoji">📬</div>
              
              <p>Great news! A recipient has opened your email from the campaign.</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span class="detail-value">${campaignName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact Email:</span>
                  <span class="detail-value">${contactEmail}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Opened Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Opened Time:</span>
                  <span class="detail-value">${formattedTime}</span>
                </div>
              </div>
              
              <p>This indicates that the recipient has engaged with your email campaign.</p>
              
              <div class="footer">
                <p>This is an automated notification from your email tracking system.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send open notification:', error);
      throw error;
    }

    console.log('✅ Email open notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-open-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
