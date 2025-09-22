-- Add Gmail sync functionality to sender accounts and email sends

-- Add Gmail sync fields to sender_accounts table
ALTER TABLE public.sender_accounts 
ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_client_id TEXT,
ADD COLUMN IF NOT EXISTS gmail_client_secret TEXT;

-- Add Gmail sync tracking to email_sends table
ALTER TABLE public.email_sends 
ADD COLUMN IF NOT EXISTS gmail_synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT,
ADD COLUMN IF NOT EXISTS gmail_synced_at TIMESTAMP WITH TIME ZONE;

-- Create index for Gmail sync queries
CREATE INDEX IF NOT EXISTS idx_email_sends_gmail_synced ON public.email_sends(gmail_synced, created_at);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_gmail_sync ON public.sender_accounts(gmail_sync_enabled, email);

-- Add function to enable Gmail sync for a sender account
CREATE OR REPLACE FUNCTION public.enable_gmail_sync(
  sender_email_param text,
  refresh_token_param text,
  client_id_param text,
  client_secret_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sender_accounts 
  SET 
    gmail_sync_enabled = true,
    gmail_refresh_token = refresh_token_param,
    gmail_client_id = client_id_param,
    gmail_client_secret = client_secret_param,
    updated_at = now()
  WHERE email = sender_email_param;
  
  IF FOUND THEN
    RAISE NOTICE 'Gmail sync enabled for sender: %', sender_email_param;
  ELSE
    RAISE NOTICE 'Sender account not found: %', sender_email_param;
  END IF;
END;
$$;

-- Add function to disable Gmail sync for a sender account
CREATE OR REPLACE FUNCTION public.disable_gmail_sync(sender_email_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sender_accounts 
  SET 
    gmail_sync_enabled = false,
    gmail_refresh_token = NULL,
    gmail_client_id = NULL,
    gmail_client_secret = NULL,
    updated_at = now()
  WHERE email = sender_email_param;
  
  IF FOUND THEN
    RAISE NOTICE 'Gmail sync disabled for sender: %', sender_email_param;
  ELSE
    RAISE NOTICE 'Sender account not found: %', sender_email_param;
  END IF;
END;
$$;

-- Add function to get Gmail sync statistics
CREATE OR REPLACE FUNCTION public.get_gmail_sync_stats(user_id_param uuid)
RETURNS TABLE(
  total_emails bigint,
  synced_emails bigint,
  sync_rate numeric,
  sender_accounts_with_sync bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(es.id) as total_emails,
    COUNT(CASE WHEN es.gmail_synced = true THEN 1 END) as synced_emails,
    CASE 
      WHEN COUNT(es.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN es.gmail_synced = true THEN 1 END)::numeric / COUNT(es.id)::numeric) * 100, 2)
      ELSE 0
    END as sync_rate,
    COUNT(DISTINCT CASE WHEN sa.gmail_sync_enabled = true THEN sa.id END) as sender_accounts_with_sync
  FROM public.email_sends es
  JOIN public.sender_accounts sa ON es.sender_account_id = sa.id
  JOIN public.campaigns c ON es.campaign_id = c.id
  WHERE c.user_id = user_id_param
    AND es.created_at >= NOW() - INTERVAL '30 days';
END;
$$;
