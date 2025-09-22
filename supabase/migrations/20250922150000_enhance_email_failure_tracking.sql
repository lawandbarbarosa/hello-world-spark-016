-- Enhance email failure tracking with detailed categorization
-- Add new failure types and improve error categorization

-- Add new status values to email_sends table
ALTER TABLE public.email_sends 
DROP CONSTRAINT IF EXISTS email_sends_status_check;

ALTER TABLE public.email_sends 
ADD CONSTRAINT email_sends_status_check 
CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'rejected', 'invalid_address', 'blocked', 'spam', 'opened', 'clicked'));

-- Add failure category and detailed error tracking
ALTER TABLE public.email_sends 
ADD COLUMN IF NOT EXISTS failure_category TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS bounce_type TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for failure categories
CREATE INDEX IF NOT EXISTS idx_email_sends_failure_category ON public.email_sends(failure_category);
CREATE INDEX IF NOT EXISTS idx_email_sends_bounce_type ON public.email_sends(bounce_type);

-- Add function to categorize email failures
CREATE OR REPLACE FUNCTION public.categorize_email_failure(
  error_message_param TEXT,
  status_param TEXT DEFAULT 'failed'
)
RETURNS TABLE (
  failure_category TEXT,
  failure_reason TEXT,
  bounce_type TEXT,
  rejection_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  error_lower TEXT;
  category TEXT;
  reason TEXT;
  bounce TEXT;
  rejection TEXT;
BEGIN
  error_lower := LOWER(COALESCE(error_message_param, ''));
  
  -- Initialize defaults
  category := 'unknown';
  reason := error_message_param;
  bounce := NULL;
  rejection := NULL;
  
  -- Categorize based on error message content
  IF error_lower LIKE '%invalid%email%' OR error_lower LIKE '%malformed%' OR error_lower LIKE '%syntax%' THEN
    category := 'invalid_address';
    reason := 'Invalid email address format';
    
  ELSIF error_lower LIKE '%bounce%' OR error_lower LIKE '%undeliverable%' OR error_lower LIKE '%mailbox%full%' THEN
    category := 'bounced';
    reason := 'Email bounced - recipient mailbox issue';
    bounce := 'hard';
    
  ELSIF error_lower LIKE '%reject%' OR error_lower LIKE '%blocked%' OR error_lower LIKE '%spam%' THEN
    category := 'rejected';
    reason := 'Email rejected by recipient server';
    rejection := 'server_rejection';
    
  ELSIF error_lower LIKE '%rate%limit%' OR error_lower LIKE '%quota%' OR error_lower LIKE '%throttle%' THEN
    category := 'rate_limited';
    reason := 'Rate limited or quota exceeded';
    
  ELSIF error_lower LIKE '%authentication%' OR error_lower LIKE '%unauthorized%' OR error_lower LIKE '%credential%' THEN
    category := 'authentication';
    reason := 'Authentication or credential issue';
    
  ELSIF error_lower LIKE '%network%' OR error_lower LIKE '%timeout%' OR error_lower LIKE '%connection%' THEN
    category := 'network';
    reason := 'Network or connection issue';
    
  ELSIF error_lower LIKE '%domain%' OR error_lower LIKE '%dns%' OR error_lower LIKE '%mx%' THEN
    category := 'domain_issue';
    reason := 'Domain or DNS configuration issue';
    
  ELSIF error_lower LIKE '%content%' OR error_lower LIKE '%policy%' OR error_lower LIKE '%filter%' THEN
    category := 'content_filtered';
    reason := 'Content filtered or blocked by policy';
    
  ELSE
    category := 'unknown';
    reason := COALESCE(error_message_param, 'Unknown error');
  END IF;
  
  RETURN QUERY SELECT category, reason, bounce, rejection;
END;
$$;

-- Add function to update email failure details
CREATE OR REPLACE FUNCTION public.update_email_failure_details(
  email_send_id_param UUID,
  error_message_param TEXT,
  status_param TEXT DEFAULT 'failed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failure_details RECORD;
BEGIN
  -- Get failure categorization
  SELECT * INTO failure_details
  FROM public.categorize_email_failure(error_message_param, status_param);
  
  -- Update the email send record
  UPDATE public.email_sends
  SET 
    status = status_param,
    error_message = error_message_param,
    failure_category = failure_details.failure_category,
    failure_reason = failure_details.failure_reason,
    bounce_type = failure_details.bounce_type,
    rejection_reason = failure_details.rejection_reason
  WHERE id = email_send_id_param;
END;
$$;

-- Add function to get detailed failure statistics
CREATE OR REPLACE FUNCTION public.get_email_failure_stats(user_id_param UUID)
RETURNS TABLE (
  total_emails BIGINT,
  successful_emails BIGINT,
  failed_emails BIGINT,
  bounced_emails BIGINT,
  rejected_emails BIGINT,
  invalid_address_emails BIGINT,
  blocked_emails BIGINT,
  spam_emails BIGINT,
  rate_limited_emails BIGINT,
  authentication_errors BIGINT,
  network_errors BIGINT,
  domain_errors BIGINT,
  content_filtered_emails BIGINT,
  unknown_errors BIGINT,
  overall_failure_rate NUMERIC,
  bounce_rate NUMERIC,
  rejection_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH email_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as successful,
      COUNT(*) FILTER (WHERE status IN ('failed', 'bounced', 'rejected', 'invalid_address', 'blocked', 'spam')) as failed,
      COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE status = 'invalid_address') as invalid_address,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE status = 'spam') as spam,
      COUNT(*) FILTER (WHERE failure_category = 'rate_limited') as rate_limited,
      COUNT(*) FILTER (WHERE failure_category = 'authentication') as auth_errors,
      COUNT(*) FILTER (WHERE failure_category = 'network') as network_errors,
      COUNT(*) FILTER (WHERE failure_category = 'domain_issue') as domain_errors,
      COUNT(*) FILTER (WHERE failure_category = 'content_filtered') as content_filtered,
      COUNT(*) FILTER (WHERE failure_category = 'unknown') as unknown_errors
    FROM public.email_sends es
    JOIN public.campaigns c ON es.campaign_id = c.id
    WHERE c.user_id = user_id_param
  )
  SELECT 
    es.total,
    es.successful,
    es.failed,
    es.bounced,
    es.rejected,
    es.invalid_address,
    es.blocked,
    es.spam,
    es.rate_limited,
    es.auth_errors,
    es.network_errors,
    es.domain_errors,
    es.content_filtered,
    es.unknown_errors,
    CASE 
      WHEN es.total > 0 THEN ROUND((es.failed::NUMERIC / es.total::NUMERIC) * 100, 2)
      ELSE 0 
    END as overall_failure_rate,
    CASE 
      WHEN es.total > 0 THEN ROUND((es.bounced::NUMERIC / es.total::NUMERIC) * 100, 2)
      ELSE 0 
    END as bounce_rate,
    CASE 
      WHEN es.total > 0 THEN ROUND((es.rejected::NUMERIC / es.total::NUMERIC) * 100, 2)
      ELSE 0 
    END as rejection_rate
  FROM email_stats es;
END;
$$;

-- Add function to get recent failures by category
CREATE OR REPLACE FUNCTION public.get_recent_failures_by_category(
  user_id_param UUID,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  contact_email TEXT,
  campaign_name TEXT,
  status TEXT,
  failure_category TEXT,
  failure_reason TEXT,
  bounce_type TEXT,
  rejection_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    c.email as contact_email,
    camp.name as campaign_name,
    es.status,
    es.failure_category,
    es.failure_reason,
    es.bounce_type,
    es.rejection_reason,
    es.error_message,
    es.created_at
  FROM public.email_sends es
  JOIN public.contacts c ON es.contact_id = c.id
  JOIN public.campaigns camp ON es.campaign_id = camp.id
  WHERE camp.user_id = user_id_param
    AND es.status IN ('failed', 'bounced', 'rejected', 'invalid_address', 'blocked', 'spam')
  ORDER BY es.created_at DESC
  LIMIT limit_count;
END;
$$;
