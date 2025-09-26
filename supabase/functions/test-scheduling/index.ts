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
    console.log("🧪 Testing email scheduling system...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    console.log("⏰ Current time:", now.toISOString());

    // Test 1: Check scheduled emails
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .order("scheduled_for", { ascending: true });

    if (scheduledError) {
      console.error("❌ Error fetching scheduled emails:", scheduledError);
      return new Response(JSON.stringify({ error: "Error fetching scheduled emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test 2: Check email sequences with scheduling
    const { data: sequences, error: sequencesError } = await supabase
      .from("email_sequences")
      .select(`
        *,
        campaigns!inner(name, status)
      `)
      .not("scheduled_date", "is", null);

    if (sequencesError) {
      console.error("❌ Error fetching sequences:", sequencesError);
    }

    // Test 3: Check cron job status
    const { data: cronJobs, error: cronError } = await supabase
      .from("cron.job")
      .select("*")
      .eq("jobname", "process-scheduled-emails");

    if (cronError) {
      console.error("❌ Error fetching cron jobs:", cronError);
    }

    // Test 4: Check recent cron job runs
    const { data: cronRuns, error: cronRunsError } = await supabase
      .from("cron.job_run_details")
      .select("*")
      .eq("jobname", "process-scheduled-emails")
      .order("start_time", { ascending: false })
      .limit(5);

    if (cronRunsError) {
      console.error("❌ Error fetching cron runs:", cronRunsError);
    }

    // Test 5: Check environment variables
    const envCheck = {
      RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    const results = {
      currentTime: now.toISOString(),
      scheduledEmails: {
        total: scheduledEmails?.length || 0,
        ready: scheduledEmails?.filter(email => 
          email.status === "scheduled" && 
          new Date(email.scheduled_for) <= now
        ).length || 0,
        details: scheduledEmails?.map(email => ({
          id: email.id,
          status: email.status,
          scheduledFor: email.scheduled_for,
          isReady: email.status === "scheduled" && new Date(email.scheduled_for) <= now
        })) || []
      },
      emailSequences: {
        total: sequences?.length || 0,
        withScheduling: sequences?.filter(seq => seq.scheduled_date).length || 0,
        details: sequences?.map(seq => ({
          id: seq.id,
          stepNumber: seq.step_number,
          scheduledDate: seq.scheduled_date,
          scheduledTime: seq.scheduled_time,
          campaignName: seq.campaigns?.name,
          campaignStatus: seq.campaigns?.status
        })) || []
      },
      cronJob: {
        exists: (cronJobs?.length || 0) > 0,
        details: cronJobs?.[0] || null,
        recentRuns: cronRuns?.map(run => ({
          startTime: run.start_time,
          endTime: run.end_time,
          status: run.status,
          returnMessage: run.return_message
        })) || []
      },
      environment: envCheck,
      recommendations: [] as string[]
    };

    // Generate recommendations
    if (results.scheduledEmails.ready > 0) {
      results.recommendations.push("✅ Found scheduled emails ready to send - cron job should process them");
    } else if (results.scheduledEmails.total > 0) {
      results.recommendations.push("⏳ Scheduled emails exist but none are ready yet");
    } else {
      results.recommendations.push("❌ No scheduled emails found - check if campaigns are creating them");
    }

    if (!results.cronJob.exists) {
      results.recommendations.push("❌ Cron job not found - need to create it");
    } else if (results.cronJob.recentRuns.length === 0) {
      results.recommendations.push("⚠️ Cron job exists but no recent runs found");
    } else {
      const lastRun = results.cronJob.recentRuns[0];
      const lastRunTime = new Date(lastRun.startTime);
      const timeSinceLastRun = now.getTime() - lastRunTime.getTime();
      const minutesSinceLastRun = Math.floor(timeSinceLastRun / (1000 * 60));
      
      if (minutesSinceLastRun > 10) {
        results.recommendations.push(`⚠️ Last cron run was ${minutesSinceLastRun} minutes ago - may not be running`);
      } else {
        results.recommendations.push(`✅ Cron job running normally (last run ${minutesSinceLastRun} minutes ago)`);
      }
    }

    if (!envCheck.RESEND_API_KEY) {
      results.recommendations.push("❌ RESEND_API_KEY not set");
    }
    if (!envCheck.SUPABASE_URL) {
      results.recommendations.push("❌ SUPABASE_URL not set");
    }
    if (!envCheck.SUPABASE_SERVICE_ROLE_KEY) {
      results.recommendations.push("❌ SUPABASE_SERVICE_ROLE_KEY not set");
    }

    console.log("📊 Test results:", JSON.stringify(results, null, 2));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error in test-scheduling function:", error);
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
