# Gmail Sync Setup Guide

## The Problem
Your emails are being sent successfully but they're not appearing in your Gmail Sent folders because Gmail sync is not configured.

## The Solution
You need to authenticate your Gmail accounts to enable sync functionality. Here's how to fix it:

## Step 1: Check Your Gmail API Configuration

First, make sure your Gmail API credentials are configured in your Supabase environment:

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings > Edge Functions**
3. **Check Environment Variables for:**
   - `GMAIL_CLIENT_ID` - Your Google OAuth2 Client ID
   - `GMAIL_CLIENT_SECRET` - Your Google OAuth2 Client Secret

If these are missing, you need to set them up first (see Step 2).

## Step 2: Set Up Gmail API Credentials (If Missing)

If you don't have Gmail API credentials yet:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project or select existing one**
3. **Enable Gmail API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. **Create OAuth2 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://your-domain.com/gmail-callback`
     - `http://localhost:3000/gmail-callback` (for development)
5. **Copy the Client ID and Client Secret**
6. **Add them to Supabase Edge Functions environment variables**

## Step 3: Authenticate Your Gmail Accounts

Now you can authenticate your sender accounts:

1. **Open your application** (should be running at `http://localhost:8080`)
2. **Go to Settings > Sender Accounts**
3. **For each Gmail sender account:**
   - Click the "Connect Gmail" button next to the email
   - You'll be redirected to Google OAuth
   - Sign in with the Gmail account you want to sync
   - Grant the required permissions
   - You'll be redirected back to your app
   - The account should now show "Connected" status

## Step 4: Test Gmail Sync

1. **Launch a campaign** with an authenticated Gmail sender account
2. **Check your Gmail Sent folder** - emails should now appear there
3. **Check the Dashboard** - Gmail Sync Status should show "Working"

## Troubleshooting

### Gmail API Not Configured Error
If you see "Gmail API credentials not configured":
- Make sure `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are set in Supabase
- Redeploy your Edge Functions after adding the environment variables

### Authentication Fails
If Gmail authentication fails:
- Check that your OAuth2 redirect URI is correct
- Make sure Gmail API is enabled in Google Cloud Console
- Verify the OAuth2 consent screen is configured

### Emails Still Not Syncing
If emails are sent but not syncing to Gmail:
- Check that the sender account shows "Connected" status
- Look at the Dashboard Gmail Sync Status for error details
- Check the Inbox for detailed error messages
- Verify the Gmail refresh token is valid

### Gmail API Quotas
If you hit Gmail API quotas:
- Check your Google Cloud Console quotas
- Consider upgrading your Gmail API quota
- The free tier has limits on API calls per day

## What's New in the Application

### Gmail Authentication Button
- Added to both active and unused sender accounts
- Shows connection status (Connected/Not Connected)
- Allows you to connect/disconnect Gmail sync

### Gmail Sync Status Dashboard
- Shows overall Gmail sync health
- Displays sync statistics
- Provides troubleshooting guidance

### Enhanced Error Messages
- Detailed error information in the Inbox
- Troubleshooting suggestions for common issues
- Better visibility into what's failing

## Environment Variables Required

Make sure these are set in your Supabase Edge Functions:

```
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
```

## Gmail API Permissions

The application requests these Gmail API scopes:
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify Gmail (for Sent folder)

## Support

If you're still having issues:
1. Check the browser console for errors
2. Look at the Supabase Edge Functions logs
3. Verify your Gmail API setup in Google Cloud Console
4. Check that your OAuth2 redirect URIs are correct

The Gmail sync functionality is now fully implemented and ready to use once you authenticate your accounts!
