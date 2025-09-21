# NeverBounce API Setup - Quick Guide

## ⚠️ API Key Issue
**Widget Key**: `public_7ed0f4312911b8ae48d65bc5ea3b582a` (❌ Wrong type)
**Needed**: Private or Secret API Key (starts with `private_` or `secret_`)

## 🔍 How to Get the Right API Key

1. **Go to NeverBounce Dashboard**: https://neverbounce.com
2. **Navigate to**: Apps → Your App
3. **Look for**: Private API Key or Secret API Key (NOT Public/Widget key)
4. **Copy the key** that starts with `private_` or `secret_`

## 🚀 Setup Steps

### 1. Add Environment Variable in Supabase
1. Go to: https://supabase.com/dashboard/project/ogzdqhvpsobpwxteqpnx
2. Click **Edge Functions** in the left sidebar
3. Find the **verify-email** function
4. Click **Settings** or **Environment Variables**
5. Add new variable:
   - **Name**: `NEVERBOUNCE_API_KEY`
   - **Value**: `[Your Private or Secret API Key]` (starts with `private_` or `secret_`)

### 2. Deploy the Function
1. In the **verify-email** function page
2. Click **Deploy** or **Redeploy**

### 3. Test Email Verification
1. Go to your app's **Delivery** page
2. Try verifying an email address
3. Check the results!

## 🎯 What's Now Active

✅ **Full NeverBounce Integration**
✅ **Real-time Email Validation**
✅ **Deliverability Scoring**
✅ **Spam Detection**
✅ **Disposable Email Detection**
✅ **Catch-all Detection**
✅ **Suggested Corrections**

## 🔧 If You Need a Secret Key Instead

If the private key doesn't work, you can get a Secret key:
1. Go to NeverBounce Dashboard
2. Navigate to **Apps** → **Your App**
3. Look for **Secret Key** (starts with `secret_`)
4. Replace the environment variable value

## 📊 Verification Results

The system will now return detailed results:
- **valid**: Email is deliverable
- **invalid**: Email doesn't exist
- **disposable**: Temporary/disposable email
- **catchall**: Domain accepts all emails
- **unknown**: Cannot determine status

Your email verification is now fully activated with NeverBounce! 🎉
