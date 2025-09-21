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

// Basic email validation function
function validateEmail(email: string): {
  result: 'valid' | 'invalid' | 'unknown';
  isValid: boolean;
  isDeliverable: boolean;
  flags: string[];
  suggestedCorrection?: string;
  executionTime: number;
} {
  const startTime = Date.now();
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      result: 'invalid',
      isValid: false,
      isDeliverable: false,
      flags: ['invalid_format'],
      executionTime: Date.now() - startTime
    };
  }
  
  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'temp-mail.org', 'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (disposableDomains.includes(domain)) {
    return {
      result: 'invalid',
      isValid: false,
      isDeliverable: false,
      flags: ['disposable_email'],
      executionTime: Date.now() - startTime
    };
  }
  
  // Check for common typos and suggest corrections
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const suggestions: string[] = [];
  
  for (const commonDomain of commonDomains) {
    if (domain && domain.includes(commonDomain.split('.')[0])) {
      suggestions.push(email.replace(domain, commonDomain));
    }
  }
  
  return {
    result: 'valid',
    isValid: true,
    isDeliverable: true,
    flags: [],
    suggestedCorrection: suggestions.length > 0 ? suggestions[0] : undefined,
    executionTime: Date.now() - startTime
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Use basic validation
    const verificationResult = validateEmail(email);
    console.log('Verification result:', JSON.stringify(verificationResult, null, 2));

    // Store verification result in database if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('email_verifications').insert({
        email,
        user_id: userId,
        verification_result: verificationResult.result,
        is_valid: verificationResult.isValid,
        is_deliverable: verificationResult.isDeliverable,
        flags: verificationResult.flags,
        suggested_correction: verificationResult.suggestedCorrection,
        execution_time_ms: verificationResult.executionTime,
        verified_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        email,
        result: verificationResult.result,
        isValid: verificationResult.isValid,
        isDeliverable: verificationResult.isDeliverable,
        flags: verificationResult.flags,
        suggestedCorrection: verificationResult.suggestedCorrection,
        executionTime: verificationResult.executionTime,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-email-simple function:", error);
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
