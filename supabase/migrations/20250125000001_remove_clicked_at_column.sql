-- Remove clicked_at column from email_sends table
ALTER TABLE public.email_sends DROP COLUMN IF EXISTS clicked_at;

-- Update the status check constraint to remove 'clicked' status
ALTER TABLE public.email_sends DROP CONSTRAINT IF EXISTS email_sends_status_check;
ALTER TABLE public.email_sends ADD CONSTRAINT email_sends_status_check 
  CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened'));
