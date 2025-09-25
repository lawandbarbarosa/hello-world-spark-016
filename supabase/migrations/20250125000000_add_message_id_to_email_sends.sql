-- Add message_id column to email_sends table for reply tracking
ALTER TABLE public.email_sends 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Create index for better performance when querying by message_id
CREATE INDEX IF NOT EXISTS idx_email_sends_message_id ON public.email_sends(message_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN public.email_sends.message_id IS 'Unique Message-ID header for email reply tracking';
