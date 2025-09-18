import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyEmailRequest {
  email: string;
  userId?: string;
}

interface NeverBounceResponse {
  result: 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown';
  flags: string[];
  suggested_correction: string | null;
  execution_time: number;
  status?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const neverBounceApiKey = Deno.env.get("NEVERBOUNCE_API_KEY");
    if (!neverBounceApiKey) {
      throw new Error("NeverBounce API key not configured");
    }

    // Validate key format early to provide clear guidance
    const keyPrefix = neverBounceApiKey.split('_')[0];
    if (keyPrefix !== 'secret') {
      return new Response(
        JSON.stringify({
          error: "NeverBounce Secret Key required. Use the Secret API key (starts with 'secret_') from NeverBounce Apps > Your App > Secret Key. Keys like 'private_' or 'public_' won't work.",
          result: 'error',
          isValid: false,
          isDeliverable: false
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, userId }: VerifyEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Verifying email: ${email}`);

    // Call NeverBounce API
    const neverBounceUrl = `https://api.neverbounce.com/v4/single/check?key=${neverBounceApiKey}&email=${encodeURIComponent(email)}`;
    
    const neverBounceResponse = await fetch(neverBounceUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!neverBounceResponse.ok) {
      const errorText = await neverBounceResponse.text();
      console.error('NeverBounce API error:', errorText);
      throw new Error(`NeverBounce API error: ${neverBounceResponse.status}`);
    }

    const verificationResult: NeverBounceResponse = await neverBounceResponse.json();
    console.log('Verification result:', JSON.stringify(verificationResult, null, 2));

    // Check if NeverBounce returned an error
    if (verificationResult.status === 'auth_failure') {
      console.error('NeverBounce API authentication failed:', verificationResult.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid NeverBounce API key. Please check your API configuration.',
          email,
          result: 'error',
          isValid: false,
          isDeliverable: false 
        }),
        {
          status: 200, // Return 200 so the frontend can handle the error message
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (verificationResult.status === 'general_failure') {
      console.error('NeverBounce API general failure:', verificationResult.message);
      return new Response(
        JSON.stringify({ 
          error: `NeverBounce API error: ${verificationResult.message}`,
          email,
          result: 'error',
          isValid: false,
          isDeliverable: false 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Ensure we have a valid result
    if (!verificationResult.result) {
      console.error('NeverBounce API returned invalid response:', verificationResult);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from email verification service',
          email,
          result: 'error',
          isValid: false,
          isDeliverable: false 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Determine if email is deliverable
    const isValid = verificationResult.result === 'valid';
    const isDeliverable = ['valid', 'catchall'].includes(verificationResult.result);
    
    // Store verification result in database if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('email_verifications').insert({
        email,
        user_id: userId,
        verification_result: verificationResult.result,
        is_valid: isValid,
        is_deliverable: isDeliverable,
        flags: verificationResult.flags,
        suggested_correction: verificationResult.suggested_correction,
        execution_time_ms: verificationResult.execution_time,
        verified_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        email,
        result: verificationResult.result,
        isValid,
        isDeliverable,
        flags: verificationResult.flags,
        suggestedCorrection: verificationResult.suggested_correction,
        executionTime: verificationResult.execution_time,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        email: null,
        result: 'error',
        isValid: false,
        isDeliverable: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);