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

    console.log(`Tracking email open for ID: ${emailSendId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.log(`Successfully recorded email open for ID: ${emailSendId}`);
    } else {
      console.log(`Email ${emailSendId} was already marked as opened or not found`);
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

serve(handler);