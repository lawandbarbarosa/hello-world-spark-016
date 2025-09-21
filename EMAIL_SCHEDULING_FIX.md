# 📧 Email Scheduling Fix Guide

## 🔍 **Problem Identified**

Your follow-up emails are not being delivered because of several potential issues:

1. **Cron Job Not Running** - The scheduled email processor might not be triggered
2. **Missing Environment Variables** - RESEND_API_KEY might not be set
3. **Database Issues** - Scheduled emails might not be created properly
4. **Function Deployment** - The process-scheduled-emails function might not be deployed

## 🛠️ **Step-by-Step Fix**

### **Step 1: Check Environment Variables**

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/ogzdqhvpsobpwxteqpnx
   - Go to **Edge Functions** → **process-scheduled-emails**

2. **Add Required Environment Variables**:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key
   - **Name**: `SUPABASE_URL`
   - **Value**: `https://ogzdqhvpsobpwxteqpnx.supabase.co`
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service role key

### **Step 2: Deploy the Function**

1. **Deploy process-scheduled-emails function**:
   - Copy code from `supabase/functions/process-scheduled-emails/index.ts`
   - Deploy the function in Supabase Dashboard

### **Step 3: Test the Cron Job**

1. **Check if cron job is running**:
   - Go to Supabase Dashboard → **Database** → **SQL Editor**
   - Run this query:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-scheduled-emails';
   ```

2. **If cron job doesn't exist, create it**:
   ```sql
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

### **Step 4: Manual Test**

1. **Test the function manually**:
   - Go to **Edge Functions** → **process-scheduled-emails**
   - Click **Invoke** to test it manually
   - Check the logs for any errors

### **Step 5: Check Scheduled Emails**

1. **Check if scheduled emails are being created**:
   ```sql
   SELECT * FROM scheduled_emails ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check email sequences**:
   ```sql
   SELECT * FROM email_sequences WHERE scheduled_date IS NOT NULL;
   ```

## 🚨 **Common Issues & Solutions**

### **Issue 1: Cron Job Not Running**
- **Solution**: Recreate the cron job with correct URL and auth

### **Issue 2: Missing RESEND_API_KEY**
- **Solution**: Add the environment variable in Supabase

### **Issue 3: Function Not Deployed**
- **Solution**: Deploy the process-scheduled-emails function

### **Issue 4: Wrong Timezone**
- **Solution**: Check user timezone settings in user_settings table

## 🧪 **Testing Steps**

1. **Create a test campaign** with follow-up emails
2. **Set follow-up times** to 1-2 minutes in the future
3. **Launch the campaign**
4. **Check scheduled_emails table** for created records
5. **Wait 5 minutes** for cron job to run
6. **Check email_sends table** for sent emails

## 📊 **Debugging Queries**

```sql
-- Check scheduled emails
SELECT 
  se.*,
  c.email as contact_email,
  es.subject,
  es.step_number
FROM scheduled_emails se
JOIN contacts c ON se.contact_id = c.id
JOIN email_sequences es ON se.sequence_id = es.id
ORDER BY se.scheduled_for DESC;

-- Check cron job status
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-scheduled-emails' 
ORDER BY start_time DESC 
LIMIT 5;

-- Check email sequences with scheduling
SELECT 
  es.*,
  c.name as campaign_name
FROM email_sequences es
JOIN campaigns c ON es.campaign_id = c.id
WHERE es.scheduled_date IS NOT NULL;
```

## 🎯 **Expected Results**

After fixing:
- ✅ Follow-up emails should be scheduled in `scheduled_emails` table
- ✅ Cron job should run every 5 minutes
- ✅ Emails should be sent at scheduled times
- ✅ Email status should update to "sent" in `email_sends` table

## 🆘 **If Still Not Working**

1. **Check Supabase logs** for errors
2. **Verify all environment variables** are set
3. **Test the function manually** first
4. **Check database permissions** for cron job
5. **Contact support** if cron extensions aren't available
