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
    console.log("🔍 Diagnosing email scheduling system...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    console.log("⏰ Current time:", now.toISOString());

    // Test 1: Check if process-scheduled-emails function exists
    const functionCheck = {
      exists: false,
      url: `${supabaseUrl}/functions/v1/process-scheduled-emails`,
      note: "Check if this function is deployed in Supabase Dashboard"
    };

    // Test 2: Check scheduled emails
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (scheduledError) {
      console.error("❌ Error fetching scheduled emails:", scheduledError);
    }

    // Test 3: Check email sequences with scheduling
    const { data: sequences, error: sequencesError } = await supabase
      .from("email_sequences")
      .select(`
        *,
        campaigns!inner(name, status, user_id)
      `)
      .not("scheduled_date", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (sequencesError) {
      console.error("❌ Error fetching sequences:", sequencesError);
    }

    // Test 4: Check recent campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select(`
        *,
        email_sequences(scheduled_date, scheduled_time, step_number)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (campaignsError) {
      console.error("❌ Error fetching campaigns:", campaignsError);
    }

    // Test 5: Check cron job status
    const { data: cronJobs, error: cronError } = await supabase
      .from("cron.job")
      .select("*")
      .eq("jobname", "process-scheduled-emails");

    if (cronError) {
      console.error("❌ Error fetching cron jobs:", cronError);
    }

    // Test 6: Check recent cron job runs
    const { data: cronRuns, error: cronRunsError } = await supabase
      .from("cron.job_run_details")
      .select("*")
      .eq("jobname", "process-scheduled-emails")
      .order("start_time", { ascending: false })
      .limit(5);

    if (cronRunsError) {
      console.error("❌ Error fetching cron runs:", cronRunsError);
    }

    // Test 7: Check environment variables
    const envCheck = {
      RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    // Test 8: Check email sends
    const { data: emailSends, error: emailSendsError } = await supabase
      .from("email_sends")
      .select(`
        *,
        contacts(email),
        campaigns(name),
        email_sequences(step_number)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (emailSendsError) {
      console.error("❌ Error fetching email sends:", emailSendsError);
    }

    // Analyze the data
    const analysis = {
      currentTime: now.toISOString(),
      functionCheck,
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
          isReady: email.status === "scheduled" && new Date(email.scheduled_for) <= now,
          campaignId: email.campaign_id,
          contactId: email.contact_id
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
      campaigns: {
        total: campaigns?.length || 0,
        withSequences: campaigns?.filter(c => c.email_sequences?.length > 0).length || 0,
        details: campaigns?.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          sequenceCount: campaign.email_sequences?.length || 0,
          hasScheduledSequences: campaign.email_sequences?.some(seq => seq.scheduled_date) || false
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
      emailSends: {
        total: emailSends?.length || 0,
        sent: emailSends?.filter(e => e.status === 'sent').length || 0,
        failed: emailSends?.filter(e => e.status === 'failed').length || 0,
        pending: emailSends?.filter(e => e.status === 'pending').length || 0,
        details: emailSends?.map(send => ({
          id: send.id,
          status: send.status,
          sentAt: send.sent_at,
          contactEmail: send.contacts?.email,
          campaignName: send.campaigns?.name,
          stepNumber: send.email_sequences?.step_number
        })) || []
      },
      environment: envCheck,
      recommendations: []
    };

    // Generate recommendations
    if (analysis.scheduledEmails.ready > 0) {
      analysis.recommendations.push("✅ Found scheduled emails ready to send - cron job should process them");
    } else if (analysis.scheduledEmails.total > 0) {
      analysis.recommendations.push("⏳ Scheduled emails exist but none are ready yet");
    } else {
      analysis.recommendations.push("❌ No scheduled emails found - check if campaigns are creating them");
    }

    if (!analysis.cronJob.exists) {
      analysis.recommendations.push("❌ CRITICAL: Cron job not found - need to create it");
    } else if (analysis.cronJob.recentRuns.length === 0) {
      analysis.recommendations.push("⚠️ Cron job exists but no recent runs found");
    } else {
      const lastRun = analysis.cronJob.recentRuns[0];
      const lastRunTime = new Date(lastRun.startTime);
      const timeSinceLastRun = now.getTime() - lastRunTime.getTime();
      const minutesSinceLastRun = Math.floor(timeSinceLastRun / (1000 * 60));
      
      if (minutesSinceLastRun > 10) {
        analysis.recommendations.push(`⚠️ Last cron run was ${minutesSinceLastRun} minutes ago - may not be running`);
      } else {
        analysis.recommendations.push(`✅ Cron job running normally (last run ${minutesSinceLastRun} minutes ago)`);
      }
    }

    if (analysis.emailSequences.withScheduling === 0) {
      analysis.recommendations.push("❌ No email sequences with scheduling found - check campaign creation");
    }

    if (!envCheck.RESEND_API_KEY) {
      analysis.recommendations.push("❌ CRITICAL: RESEND_API_KEY not set in function environment");
    }
    if (!envCheck.SUPABASE_URL) {
      analysis.recommendations.push("❌ CRITICAL: SUPABASE_URL not set in function environment");
    }
    if (!envCheck.SUPABASE_SERVICE_ROLE_KEY) {
      analysis.recommendations.push("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set in function environment");
    }

    if (analysis.campaigns.withSequences === 0) {
      analysis.recommendations.push("❌ No campaigns with email sequences found - create a campaign first");
    }

    console.log("📊 Scheduling diagnosis results:", JSON.stringify(analysis, null, 2));

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error in diagnose-scheduling function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
