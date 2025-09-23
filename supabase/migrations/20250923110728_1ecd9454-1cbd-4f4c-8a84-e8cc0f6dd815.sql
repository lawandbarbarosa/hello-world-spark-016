-- Add gmail_sync_enabled column to sender_accounts
ALTER TABLE public.sender_accounts ADD COLUMN gmail_sync_enabled boolean DEFAULT false;

-- Create get_email_failure_stats function
CREATE OR REPLACE FUNCTION public.get_email_failure_stats(user_id_param uuid)
RETURNS TABLE (
  total_failures bigint,
  failure_rate numeric,
  bounce_rate numeric,
  spam_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'failed') as total_failures,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'failed')::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 2
    ) as failure_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE error_message ILIKE '%bounce%')::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 2
    ) as bounce_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE error_message ILIKE '%spam%')::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 2
    ) as spam_rate
  FROM email_sends es
  JOIN campaigns c ON es.campaign_id = c.id
  WHERE c.user_id = user_id_param
    AND es.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- Create get_recent_failures_by_category function
CREATE OR REPLACE FUNCTION public.get_recent_failures_by_category(
  user_id_param uuid,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id text,
  contact_email text,
  campaign_name text,
  status text,
  failure_category text,
  failure_reason text,
  bounce_type text,
  rejection_reason text,
  error_message text,
  created_at text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id::text,
    co.email as contact_email,
    ca.name as campaign_name,
    es.status,
    CASE 
      WHEN es.error_message ILIKE '%bounce%' THEN 'bounce'
      WHEN es.error_message ILIKE '%spam%' THEN 'spam'
      WHEN es.error_message ILIKE '%invalid%' THEN 'invalid_email'
      ELSE 'other'
    END as failure_category,
    COALESCE(es.error_message, 'Unknown error') as failure_reason,
    CASE 
      WHEN es.error_message ILIKE '%hard bounce%' THEN 'hard'
      WHEN es.error_message ILIKE '%soft bounce%' THEN 'soft'
      ELSE 'unknown'
    END as bounce_type,
    es.error_message as rejection_reason,
    es.error_message,
    es.created_at::text
  FROM email_sends es
  JOIN contacts co ON es.contact_id = co.id
  JOIN campaigns ca ON es.campaign_id = ca.id
  WHERE ca.user_id = user_id_param
    AND es.status = 'failed'
    AND es.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY es.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Create get_contact_replies function
CREATE OR REPLACE FUNCTION public.get_contact_replies(user_id_param uuid)
RETURNS TABLE (
  id text,
  contact_email text,
  campaign_name text,
  reply_content text,
  replied_at text,
  sender_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id::text,
    co.email as contact_email,
    ca.name as campaign_name,
    'Reply received'::text as reply_content,
    co.replied_at::text,
    sa.email as sender_email
  FROM contacts co
  JOIN campaigns ca ON co.campaign_id = ca.id
  JOIN sender_accounts sa ON sa.campaign_id = ca.id
  WHERE ca.user_id = user_id_param
    AND co.replied_at IS NOT NULL
  ORDER BY co.replied_at DESC
  LIMIT 50;
END;
$$;

-- Create enable_gmail_sync function
CREATE OR REPLACE FUNCTION public.enable_gmail_sync(
  sender_account_id_param uuid,
  user_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sender_accounts 
  SET gmail_sync_enabled = true 
  WHERE id = sender_account_id_param 
    AND user_id = user_id_param;
  
  RETURN FOUND;
END;
$$;

-- Create disable_gmail_sync function
CREATE OR REPLACE FUNCTION public.disable_gmail_sync(
  sender_account_id_param uuid,
  user_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sender_accounts 
  SET gmail_sync_enabled = false 
  WHERE id = sender_account_id_param 
    AND user_id = user_id_param;
  
  RETURN FOUND;
END;
$$;