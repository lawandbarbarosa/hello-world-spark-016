-- Add Gmail sync columns to sender_accounts table
ALTER TABLE sender_accounts
ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups of Gmail-enabled accounts
CREATE INDEX IF NOT EXISTS idx_sender_accounts_gmail_sync 
ON sender_accounts(gmail_sync_enabled) 
WHERE gmail_sync_enabled = true;

-- Add comment explaining the columns
COMMENT ON COLUMN sender_accounts.gmail_sync_enabled IS 'Whether emails should be synced to Gmail Sent folder';
COMMENT ON COLUMN sender_accounts.gmail_refresh_token IS 'OAuth2 refresh token for Gmail API access';
COMMENT ON COLUMN sender_accounts.gmail_access_token IS 'Cached OAuth2 access token for Gmail API';
COMMENT ON COLUMN sender_accounts.gmail_token_expiry IS 'Expiry time for the cached access token';