# 🚀 Deploy Follow-Up Emails - Step by Step

## 🎯 **Goal**: Get your follow-up emails working in the next 10 minutes

## ⚡ **Quick Action Plan**

### **Step 1: Deploy the Process Function (2 minutes)**

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/ogzdqhvpsobpwxteqpnx
   - Click **Edge Functions** in the left sidebar

2. **Create the Function**:
   - Click **Create Function**
   - **Name**: `process-scheduled-emails`
   - **Copy the code** from `supabase/functions/process-scheduled-emails/index.ts`
   - **Paste it** into the function editor
   - Click **Deploy**

3. **Set Environment Variables**:
   - In the function settings, add these environment variables:
   - **RESEND_API_KEY**: Your Resend API key
   - **SUPABASE_URL**: `https://ogzdqhvpsobpwxteqpnx.supabase.co`
   - **SUPABASE_SERVICE_ROLE_KEY**: Your service role key

### **Step 2: Create the Cron Job (3 minutes)**

1. **Go to SQL Editor**:
   - In Supabase Dashboard, click **SQL Editor**

2. **Run this SQL** (replace `YOUR_ANON_KEY` with your actual anon key):
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists
SELECT cron.unschedule('process-scheduled-emails');

-- Create new cron job to run every 5 minutes
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

### **Step 3: Test the System (3 minutes)**

1. **Test the Function Manually**:
   - Go to **Edge Functions** → **process-scheduled-emails**
   - Click **Invoke** with body: `{"manual": true}`
   - Check the response and logs

2. **Check Cron Job**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-scheduled-emails';
   ```

3. **Create Test Campaign**:
   - Create a new campaign with follow-up emails
   - Set follow-up time to **2-3 minutes** in the future
   - Launch the campaign
   - Wait 5 minutes and check if emails are sent

### **Step 4: Verify Everything Works (2 minutes)**

1. **Check Scheduled Emails**:
   ```sql
   SELECT * FROM scheduled_emails ORDER BY created_at DESC LIMIT 5;
   ```

2. **Check Email Sends**:
   ```sql
   SELECT * FROM email_sends WHERE status = 'sent' ORDER BY created_at DESC LIMIT 5;
   ```

## 🚨 **If Something Goes Wrong**

### **Problem 1: Function Not Deploying**
- **Solution**: Check environment variables are set correctly
- **Check**: Go to function settings and verify all 3 variables are there

### **Problem 2: Cron Job Not Creating**
- **Solution**: Check if extensions are enabled
- **Run**: `SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');`

### **Problem 3: No Scheduled Emails Created**
- **Solution**: Check if campaigns are creating sequences properly
- **Check**: Look at email_sequences table for scheduled_date values

### **Problem 4: Emails Not Sending**
- **Solution**: Check function logs for errors
- **Check**: Verify RESEND_API_KEY is correct and has sending permissions

## 📞 **Emergency Manual Processing**

If cron job doesn't work, you can manually trigger processing:

1. **Go to Edge Functions** → **process-scheduled-emails**
2. **Click Invoke** with body: `{"manual": true}`
3. **Repeat every 5 minutes** until cron job is fixed

## 🎯 **Expected Results**

After completing these steps:
- ✅ **Follow-up emails** will be scheduled when campaigns launch
- ✅ **Cron job** will process emails every 5 minutes
- ✅ **Emails will be sent** at your specified times
- ✅ **Dashboard** will show accurate sending statistics

## ⏱️ **Total Time**: 10 minutes

Follow these steps exactly and your follow-up emails will be working! Let me know if you need help with any specific step.
