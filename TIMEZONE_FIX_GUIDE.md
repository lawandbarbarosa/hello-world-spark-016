# 🌍 Timezone Fix for Kurdistan Region (UTC+3)

## 🔍 **Problem Identified**

Your follow-up emails are not being sent at the correct times because the system was using UTC timezone instead of your local Kurdistan timezone (UTC+3).

## ✅ **What I Fixed**

### **1. Email Scheduling Function** ✅
- **Updated `send-campaign-email`** to use Kurdistan timezone (UTC+3)
- **Fixed date parsing** to include timezone offset (+03:00)
- **Added timezone logging** for better debugging

### **2. Email Processing Function** ✅
- **Updated `process-scheduled-emails`** to use Asia/Baghdad timezone
- **Set Kurdistan as default** timezone instead of UTC
- **Added timezone logging** to show current Kurdistan time

### **3. Timezone Configuration** ✅
- **Created `timezone.ts`** configuration file
- **Centralized timezone settings** for Kurdistan region
- **Added helper functions** for timezone handling

## 🚀 **How to Deploy the Timezone Fix**

### **Step 1: Deploy Updated Functions (5 minutes)**

1. **Update send-campaign-email function**:
   - Go to **Supabase Dashboard** → **Edge Functions** → **send-campaign-email**
   - **Copy the updated code** from `supabase/functions/send-campaign-email/index.ts`
   - **Replace and deploy** the function

2. **Update process-scheduled-emails function**:
   - Go to **Supabase Dashboard** → **Edge Functions** → **process-scheduled-emails**
   - **Copy the updated code** from `supabase/functions/process-scheduled-emails/index.ts`
   - **Replace and deploy** the function

3. **Set Environment Variables** (if not already set):
   - **RESEND_API_KEY**: Your Resend API key
   - **SUPABASE_URL**: `https://ogzdqhvpsobpwxteqpnx.supabase.co`
   - **SUPABASE_SERVICE_ROLE_KEY**: Your service role key

### **Step 2: Create Cron Job (2 minutes)**

1. **Go to SQL Editor** in Supabase Dashboard
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

### **Step 3: Test Timezone Fix (5 minutes)**

1. **Create Test Campaign**:
   - Create a new campaign with follow-up email
   - **Set scheduled date** to today
   - **Set scheduled time** to 5 minutes from now (in Kurdistan time)
   - Launch the campaign

2. **Check the Logs**:
   - Go to **Edge Functions** → **send-campaign-email** → **Logs**
   - Look for: `Scheduling step X for specific date/time (Kurdistan UTC+3)`
   - Go to **Edge Functions** → **process-scheduled-emails** → **Logs**
   - Look for: `Current time in Kurdistan (Asia/Baghdad): XX:XX`

3. **Verify Email Delivery**:
   - Wait 5 minutes and check if follow-up email is sent
   - Check your email at the exact time you scheduled

## 🧪 **Testing Your Timezone**

### **Test 1: 10 Minutes Follow-Up**
- **Schedule email** for 10 minutes from now
- **Expected**: Email sent exactly 10 minutes later in Kurdistan time

### **Test 2: Specific Time**
- **Schedule email** for 14:30 Kurdistan time
- **Expected**: Email sent at 14:30 Kurdistan time (not UTC)

### **Test 3: Next Day**
- **Schedule email** for tomorrow at 09:00 Kurdistan time
- **Expected**: Email sent tomorrow at 09:00 Kurdistan time

## 📊 **What You'll See in Logs**

### **Scheduling (send-campaign-email)**:
```
Scheduling step 2 for specific date/time (Kurdistan UTC+3): 2024-12-25T11:30:00.000Z
Local time: 12/25/2024, 2:30:00 PM
```

### **Processing (process-scheduled-emails)**:
```
Current time in Kurdistan (Asia/Baghdad): 14:30
```

## 🎯 **Expected Results After Fix**

- ✅ **Follow-up emails** sent at your exact scheduled Kurdistan time
- ✅ **No timezone confusion** - everything in Kurdistan time (UTC+3)
- ✅ **Accurate scheduling** - emails sent when you expect them
- ✅ **Proper logging** - shows Kurdistan time in all logs

## 🚨 **If Still Not Working**

### **Check 1: Function Deployment**
- Verify both functions are deployed with updated code
- Check environment variables are set
- Test functions manually

### **Check 2: Cron Job**
- Verify cron job is created and running
- Check cron job logs for errors

### **Check 3: Timezone Verification**
- Check logs to see if Kurdistan timezone is being used
- Verify scheduled times match your local time

## 🌍 **Timezone Details**

- **Your Timezone**: Kurdistan region of Iraq (UTC+3)
- **System Timezone**: Now set to Asia/Baghdad (UTC+3)
- **Date Format**: YYYY-MM-DD
- **Time Format**: HH:MM (24-hour format)

## ⏱️ **Total Time**: 12 minutes to fix timezone issues

**Deploy the updated functions and your follow-up emails will be sent at the exact Kurdistan time you schedule them!** 🎉

No more timezone confusion - everything will work in your local Kurdistan time!
