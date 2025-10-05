import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailAuthUrlRequest {
  senderEmail: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { senderEmail, redirectUri }: GmailAuthUrlRequest = await req.json();

    if (!senderEmail || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing senderEmail or redirectUri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("GMAIL_CLIENT_ID");
    if (!clientId) {
      console.error("GMAIL_CLIENT_ID is not configured in Supabase secrets");
      return new Response(
        JSON.stringify({ error: "Gmail client ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scope = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ].join(" ");

    const state = encodeURIComponent(JSON.stringify({ senderEmail }));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(
      JSON.stringify({ authUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating Gmail auth URL:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});