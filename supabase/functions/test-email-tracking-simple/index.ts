import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧪 Testing email tracking system...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent email sends
    const { data: recentEmails, error: emailsError } = await supabase
      .from("email_sends")
      .select(`
        *,
        contacts(email, first_name, last_name),
        campaigns(name),
        email_sequences(subject, step_number)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (emailsError) {
      console.error("❌ Error fetching email sends:", emailsError);
      return new Response(JSON.stringify({ error: "Error fetching email sends" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze the data
    const analysis = {
      totalEmails: recentEmails?.length || 0,
      sentEmails: recentEmails?.filter(e => e.status === 'sent').length || 0,
      openedEmails: recentEmails?.filter(e => e.opened_at).length || 0,
      openRate: 0,
      recentEmails: recentEmails?.map(email => ({
        id: email.id,
        status: email.status,
        sentAt: email.sent_at,
        openedAt: email.opened_at,
        contactEmail: email.contacts?.email,
        campaignName: email.campaigns?.name,
        subject: email.email_sequences?.subject,
        stepNumber: email.email_sequences?.step_number,
        isOpened: !!email.opened_at,
        timeToOpen: email.opened_at ? 
          Math.round((new Date(email.opened_at).getTime() - new Date(email.sent_at).getTime()) / (1000 * 60) * 10) / 10 : null
      })) || []
    };

    if (analysis.sentEmails > 0) {
      analysis.openRate = Math.round((analysis.openedEmails / analysis.sentEmails) * 100);
    }

    // Generate recommendations
    const recommendations = [];
    
    if (analysis.openRate === 0 && analysis.sentEmails > 0) {
      recommendations.push("❌ NO OPENS DETECTED: This could mean tracking is too strict or not working");
    } else if (analysis.openRate > 80) {
      recommendations.push("📈 HIGH OPEN RATE: Very high open rate - verify this is legitimate");
    } else if (analysis.openRate < 10) {
      recommendations.push("📉 LOW OPEN RATE: Low open rate - check if tracking is working properly");
    } else {
      recommendations.push("✅ NORMAL OPEN RATE: Open rate looks reasonable");
    }

    if (analysis.recentEmails.some(e => e.isOpened && e.timeToOpen && e.timeToOpen < 2)) {
      recommendations.push("⏰ QUICK OPENS: Some emails opened very quickly - may be false positives");
    }

    const results = {
      timestamp: new Date().toISOString(),
      analysis,
      recommendations,
      trackingPixelTest: {
        url: `${supabaseUrl}/functions/v1/track-email-open?id=test123`,
        note: "Use this URL to test the tracking pixel manually"
      }
    };

    console.log("📊 Email tracking test results:", JSON.stringify(results, null, 2));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error in test-email-tracking-simple function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
