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

    // Test 1: Check recent email sends
    const { data: recentEmails, error: emailsError } = await supabase
      .from("email_sends")
      .select(`
        *,
        contacts(email, first_name, last_name),
        campaigns(name),
        email_sequences(subject)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (emailsError) {
      console.error("❌ Error fetching email sends:", emailsError);
      return new Response(JSON.stringify({ error: "Error fetching email sends" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test 2: Analyze open patterns
    const openAnalysis = {
      totalEmails: recentEmails?.length || 0,
      sentEmails: recentEmails?.filter(e => e.status === 'sent').length || 0,
      openedEmails: recentEmails?.filter(e => e.opened_at).length || 0,
      openRate: 0,
      suspiciousOpens: 0,
      legitimateOpens: 0,
      quickOpens: 0, // Opens within 5 minutes
      details: [] as Array<{
        id: any;
        contactEmail: any;
        campaignName: any;
        subject: any;
        sentAt: any;
        openedAt: any;
        minutesToOpen: number;
        isQuickOpen: boolean;
        isSuspicious: boolean;
      }>
    };

    if (openAnalysis.sentEmails > 0) {
      openAnalysis.openRate = Math.round((openAnalysis.openedEmails / openAnalysis.sentEmails) * 100);
    }

    // Analyze each email
    for (const email of recentEmails || []) {
      if (email.status === 'sent' && email.opened_at) {
        const sentTime = new Date(email.sent_at);
        const openedTime = new Date(email.opened_at);
        const timeDiff = openedTime.getTime() - sentTime.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        const isQuickOpen = minutesDiff < 5;
        if (isQuickOpen) {
          openAnalysis.quickOpens++;
        }

        openAnalysis.details.push({
          id: email.id,
          contactEmail: email.contacts?.email,
          campaignName: email.campaigns?.name,
          subject: email.email_sequences?.subject,
          sentAt: email.sent_at,
          openedAt: email.opened_at,
          minutesToOpen: Math.round(minutesDiff * 10) / 10,
          isQuickOpen: isQuickOpen,
          isSuspicious: isQuickOpen // Quick opens are suspicious
        });
      }
    }

    // Test 3: Check for patterns
    const patterns = {
      averageTimeToOpen: 0,
      quickOpenPercentage: 0,
      totalOpens: openAnalysis.openedEmails,
      suspiciousPercentage: 0
    };

    if (openAnalysis.details.length > 0) {
      const totalMinutes = openAnalysis.details.reduce((sum, detail) => sum + detail.minutesToOpen, 0);
      patterns.averageTimeToOpen = Math.round((totalMinutes / openAnalysis.details.length) * 10) / 10;
      patterns.quickOpenPercentage = Math.round((openAnalysis.quickOpens / openAnalysis.details.length) * 100);
      patterns.suspiciousPercentage = patterns.quickOpenPercentage;
    }

    // Test 4: Generate recommendations
    const recommendations = [];
    
    if (patterns.suspiciousPercentage > 50) {
      recommendations.push("🚨 HIGH SUSPICIOUS ACTIVITY: More than 50% of opens are happening within 5 minutes - likely false positives");
    } else if (patterns.suspiciousPercentage > 25) {
      recommendations.push("⚠️ MODERATE SUSPICIOUS ACTIVITY: Some opens are happening too quickly - may need better bot detection");
    } else {
      recommendations.push("✅ GOOD: Most opens appear to be legitimate with reasonable timing");
    }

    if (patterns.averageTimeToOpen < 10) {
      recommendations.push("⏰ LOW AVERAGE OPEN TIME: Emails are being opened very quickly - check for automated systems");
    }

    if (openAnalysis.openRate > 80) {
      recommendations.push("📈 HIGH OPEN RATE: Very high open rate - verify this is legitimate engagement");
    } else if (openAnalysis.openRate < 10) {
      recommendations.push("📉 LOW OPEN RATE: Low open rate - check if tracking is working properly");
    }

    // Test 5: Check tracking pixel functionality
    const trackingPixelTest = {
      pixelUrl: `${supabaseUrl}/functions/v1/track-email-open?id=test123`,
      status: "Ready to test",
      note: "Use this URL to test the tracking pixel manually"
    };

    const results = {
      timestamp: new Date().toISOString(),
      openAnalysis,
      patterns,
      recommendations,
      trackingPixelTest,
      recentEmails: recentEmails?.map(email => ({
        id: email.id,
        status: email.status,
        sentAt: email.sent_at,
        openedAt: email.opened_at,
        contactEmail: email.contacts?.email,
        campaignName: email.campaigns?.name,
        subject: email.email_sequences?.subject
      })) || []
    };

    console.log("📊 Email tracking test results:", JSON.stringify(results, null, 2));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error in test-email-tracking function:", error);
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
