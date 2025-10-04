import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent pixel PNG in base64
const TRACKING_PIXEL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emailSendId = url.searchParams.get("id");
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (!emailSendId) {
      console.log("No email send ID provided");
      // Return the tracking pixel anyway
      const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
      return new Response(pixelData, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders,
        },
      });
    }

    console.log(`🔍 Tracking email open for ID: ${emailSendId}`);
    console.log(`📱 User Agent: ${userAgent}`);
    console.log(`🌐 Referer: ${referer}`);
    console.log(`📍 IP: ${ip}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a legitimate open (not a bot or security scanner)
    const isLegitimateOpen = checkLegitimateOpen(userAgent, referer, ip);
    
    if (!isLegitimateOpen) {
      console.log(`🤖 Suspicious open detected for ID: ${emailSendId} - not recording`);
      // Still return the pixel but don't record the open
      const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
      return new Response(pixelData, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders,
        },
      });
    }

    // Get the email send record first to check if it was recently sent
    const { data: emailSend, error: fetchError } = await supabase
      .from("email_sends")
      .select("sent_at, opened_at")
      .eq("id", emailSendId)
      .single();

    if (fetchError || !emailSend) {
      console.error("Error fetching email send record:", fetchError);
      const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
      return new Response(pixelData, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders,
        },
      });
    }

    // Check if email was sent recently (within last 2 minutes) - likely a false positive
    const sentTime = new Date(emailSend.sent_at);
    const now = new Date();
    const timeDiff = now.getTime() - sentTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 2) {
      console.log(`⏰ Email opened too quickly (${minutesDiff.toFixed(1)} minutes after send) - likely false positive`);
      // Don't record this as an open
      const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
      return new Response(pixelData, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders,
        },
      });
    }

    // Update the email_sends record with opened_at timestamp
    const { data, error } = await supabase
      .from("email_sends")
      .update({ 
        opened_at: new Date().toISOString() 
      })
      .eq("id", emailSendId)
      .is("opened_at", null) // Only update if not already opened (first open)
      .select();

    if (error) {
      console.error("Error updating email open status:", error);
    } else if (data && data.length > 0) {
      console.log(`✅ Successfully recorded legitimate email open for ID: ${emailSendId}`);
      
      // Send notification if enabled
      try {
        // Fetch campaign and user settings to check if notifications are enabled
        const { data: emailSendData } = await supabase
          .from("email_sends")
          .select(`
            campaign_id,
            contact:contacts(email),
            campaign:campaigns(name, user_id)
          `)
          .eq("id", emailSendId)
          .single();

        if (emailSendData?.campaign?.user_id) {
          const { data: userSettings } = await supabase
            .from("user_settings")
            .select("open_notifications_enabled, notification_email")
            .eq("user_id", emailSendData.campaign.user_id)
            .single();

          if (userSettings?.open_notifications_enabled && userSettings?.notification_email) {
            console.log(`📧 Sending open notification to ${userSettings.notification_email}`);
            
            // Call the notification edge function
            await supabase.functions.invoke("send-open-notification", {
              body: {
                contactEmail: emailSendData.contact?.email || "Unknown",
                campaignName: emailSendData.campaign?.name || "Unknown Campaign",
                openedAt: new Date().toISOString(),
                notificationEmail: userSettings.notification_email,
              },
            });
          }
        }
      } catch (notificationError) {
        console.error("Error sending open notification:", notificationError);
        // Don't fail the tracking if notification fails
      }
    } else {
      console.log(`ℹ️ Email ${emailSendId} was already marked as opened or not found`);
    }

    // Always return the tracking pixel
    const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
    return new Response(pixelData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Error in track-email-open function:", error);
    
    // Always return the tracking pixel even on error
    const pixelData = Uint8Array.from(atob(TRACKING_PIXEL), c => c.charCodeAt(0));
    return new Response(pixelData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders,
      },
    });
  }
};

// Function to check if an email open is legitimate (not a bot or security scanner)
function checkLegitimateOpen(userAgent: string, referer: string, ip: string): boolean {
  const ua = userAgent.toLowerCase();
  
  // Common bot and security scanner patterns
  const botPatterns = [
    // Email security scanners
    'microsoft defender',
    'google safe browsing',
    'barracuda',
    'proofpoint',
    'mimecast',
    'symantec',
    'trend micro',
    'mcafee',
    'kaspersky',
    'sophos',
    'fortinet',
    'palo alto',
    'cisco',
    'fireeye',
    'crowdstrike',
    
    // Web crawlers and bots
    'bot',
    'crawler',
    'spider',
    'scraper',
    'scanner',
    'monitor',
    'checker',
    'validator',
    'tester',
    'probe',
    'ping',
    'curl',
    'wget',
    'python-requests',
    'java/',
    'go-http-client',
    'okhttp',
    'apache-httpclient',
    'libwww-perl',
    'lwp-trivial',
    'dart/',
    'node-fetch',
    'axios',
    
    // Email client security features
    'outlook safety scanner',
    'gmail security',
    'yahoo security',
    'aol security',
    'icloud security',
    'exchange security',
    'office 365 security',
    'microsoft 365 security',
    
    // Cloud security services
    'aws',
    'azure',
    'google cloud',
    'cloudflare',
    'akamai',
    'fastly',
    'incapsula',
    'sucuri',
    'cloudfront',
    
    // Monitoring and analytics
    'newrelic',
    'datadog',
    'splunk',
    'elastic',
    'kibana',
    'grafana',
    'prometheus',
    'zabbix',
    'nagios',
    'pingdom',
    'uptime',
    'monitor',
    'health check',
    'status check'
  ];
  
  // Check for obvious bot patterns in user agent (more specific patterns)
  const obviousBots = [
    'microsoft defender',
    'google safe browsing',
    'barracuda',
    'proofpoint',
    'mimecast',
    'symantec',
    'trend micro',
    'mcafee',
    'kaspersky',
    'sophos',
    'fortinet',
    'palo alto',
    'cisco',
    'fireeye',
    'crowdstrike',
    'curl',
    'wget',
    'python-requests',
    'java/',
    'go-http-client',
    'okhttp',
    'apache-httpclient',
    'libwww-perl',
    'lwp-trivial',
    'dart/',
    'node-fetch',
    'axios'
  ];
  
  for (const pattern of obviousBots) {
    if (ua.includes(pattern)) {
      console.log(`🤖 Obvious bot detected: ${pattern} in user agent`);
      return false;
    }
  }
  
  // Check for suspicious referer patterns
  if (referer) {
    const suspiciousReferers = [
      'security',
      'scanner',
      'monitor',
      'check',
      'test',
      'bot',
      'crawler'
    ];
    
    for (const pattern of suspiciousReferers) {
      if (referer.toLowerCase().includes(pattern)) {
        console.log(`🚨 Suspicious referer: ${referer}`);
        return false;
      }
    }
  }
  
  // Check for legitimate email client patterns
  const legitimatePatterns = [
    'mozilla', // Most email clients use Mozilla user agent
    'webkit',  // WebKit-based clients
    'chrome',  // Chrome-based clients
    'safari',  // Safari
    'firefox', // Firefox
    'edge',    // Microsoft Edge
    'opera',   // Opera
    'thunderbird', // Thunderbird
    'outlook', // Outlook
    'mail',    // Generic mail clients
    'email',   // Generic email clients
    'windows', // Windows-based clients
    'macintosh', // Mac-based clients
    'linux',   // Linux-based clients
    'android', // Android clients
    'iphone',  // iPhone clients
    'ipad'     // iPad clients
  ];
  
  // If user agent contains legitimate patterns, it's likely a real email client
  for (const pattern of legitimatePatterns) {
    if (ua.includes(pattern)) {
      console.log(`✅ Legitimate email client detected: ${pattern}`);
      return true;
    }
  }
  
  // If user agent is empty or very short, it might be a bot
  if (userAgent.length < 10) {
    console.log(`⚠️ Very short user agent: ${userAgent}`);
    return false;
  }
  
  // If no obvious bot patterns and user agent is reasonable length, allow it
  console.log(`✅ No obvious bot patterns found, allowing open: ${userAgent}`);
  return true;
}

serve(handler);