# 🚀 Quick Email Scheduling Fix

## 🎯 **Immediate Action Required**

Your follow-up emails aren't being sent because the **cron job isn't running**. Here's how to fix it:

## 🔧 **Step 1: Deploy the Test Function**

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/ogzdqhvpsobpwxteqpnx
   - Go to **Edge Functions** → **Create Function**

2. **Create test-scheduling function**:
   - **Name**: `test-scheduling`
   - **Copy code** from `supabase/functions/test-scheduling/index.ts`
   - **Deploy** the function

3. **Test the function**:
   - Click **Invoke** to run it
   - Check the response for issues

## 🔧 **Step 2: Deploy the Process Function**

1. **Create process-scheduled-emails function**:
   - **Name**: `process-scheduled-emails`
   - **Copy code** from `supabase/functions/process-scheduled-emails/index.ts`
   - **Deploy** the function

2. **Set Environment Variables**:
   - **RESEND_API_KEY**: Your Resend API key
   - **SUPABASE_URL**: `https://ogzdqhvpsobpwxteqpnx.supabase.co`
   - **SUPABASE_SERVICE_ROLE_KEY**: Your service role key

## 🔧 **Step 3: Create the Cron Job**

1. **Go to SQL Editor** in Supabase Dashboard
2. **Run this SQL** (replace `YOUR_ANON_KEY` with your actual anon key):

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists
SELECT cron.unschedule('process-scheduled-emails');

-- Create new cron job
SELECT cron.schedule(
  'process-scheduled-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://ogzdqhvpsobpwxteqpnx.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"automated": true}'::jsonb
  ) as request_id;
  $$
);
```

## 🔧 **Step 4: Test Everything**

1. **Test the cron job**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-scheduled-emails';
   ```

2. **Test manual processing**:
   - Go to **Edge Functions** → **process-scheduled-emails**
   - Click **Invoke** with body: `{"manual": true}`
   - Check logs for any errors

3. **Check scheduled emails**:
   ```sql
   SELECT * FROM scheduled_emails ORDER BY created_at DESC LIMIT 10;
   ```

## 🧪 **Step 5: Create Test Campaign**

1. **Create a new campaign** with follow-up emails
2. **Set follow-up time** to 2-3 minutes in the future
3. **Launch the campaign**
4. **Wait 5 minutes** and check if emails are sent

## 🚨 **If Still Not Working**

### **Check 1: Environment Variables**
```sql
-- Check if functions have the right environment variables
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-scheduled-emails' 
ORDER BY start_time DESC 
LIMIT 3;
```

### **Check 2: Manual Test**
- Go to **Edge Functions** → **process-scheduled-emails**
- Click **Invoke** with: `{"manual": true}`
- Check the response and logs

### **Check 3: Database Permissions**
```sql
-- Check if cron extensions are available
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

## 📊 **Expected Results**

After fixing:
- ✅ **Cron job exists** and runs every 5 minutes
- ✅ **Scheduled emails** are created when campaigns launch
- ✅ **Follow-up emails** are sent at scheduled times
- ✅ **Email status** updates to "sent" in database

## 🆘 **Emergency Manual Processing**

If cron job still doesn't work, you can manually trigger processing:

1. **Go to Edge Functions** → **process-scheduled-emails**
2. **Click Invoke** with body: `{"manual": true}`
3. **Repeat every 5 minutes** until cron job is fixed

## 📞 **Need Help?**

If you're still having issues:
1. **Run the test-scheduling function** and share the results
2. **Check the logs** in Supabase Dashboard
3. **Verify all environment variables** are set correctly

The most common issue is the **cron job not being created** or **environment variables not being set**.
