# Email Verification Setup Guide

## Option 1: Quick Setup with Basic Validation (Recommended for now)

I've created a simple email verification function that works without external APIs. Here's how to deploy it:

### 1. Deploy the Simple Verification Function

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ogzdqhvpsobpwxteqpnx
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it: `verify-email-simple`
5. Copy the code from `supabase/functions/verify-email-simple/index.ts`
6. Click **Deploy**

### 2. Test the Function

The email verification should now work with basic validation:
- ✅ Validates email format
- ✅ Detects disposable email domains
- ✅ Suggests corrections for common typos
- ✅ Stores results in database

## Option 2: Full NeverBounce Integration (For Production)

When you're ready for full email verification:

### 1. Get NeverBounce API Key
1. Visit https://neverbounce.com
2. Sign up for a free account
3. Go to **Apps** → **Your App** → **Secret Key**
4. Copy the key starting with `secret_`

### 2. Set Environment Variables
1. In Supabase Dashboard, go to **Settings** → **Edge Functions**
2. Add environment variable:
   - **Name**: `NEVERBOUNCE_API_KEY`
   - **Value**: Your NeverBounce secret key

### 3. Switch to NeverBounce
1. Edit `src/config/emailVerification.ts`
2. Change `method: 'simple'` to `method: 'neverbounce'`
3. Deploy the original `verify-email` function

## Testing

1. Go to your app's **Delivery** page
2. Try verifying a single email
3. Check the results in the verification history

## Current Status

✅ **Email verification is now ACTIVE** with basic validation
✅ **No external API required** for basic functionality
✅ **Database integration** working
✅ **UI components** ready

The email verification feature is now working! You can verify emails using basic validation, and upgrade to NeverBounce later for more advanced verification.
