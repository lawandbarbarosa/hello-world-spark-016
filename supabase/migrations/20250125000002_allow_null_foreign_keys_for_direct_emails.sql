-- Allow NULL values for foreign key fields in email_sends table to support direct emails
-- This is needed for the Inbox email sending functionality

-- Make foreign key fields nullable for direct emails
ALTER TABLE public.email_sends 
ALTER COLUMN campaign_id DROP NOT NULL,
ALTER COLUMN contact_id DROP NOT NULL,
ALTER COLUMN sequence_id DROP NOT NULL,
ALTER COLUMN sender_account_id DROP NOT NULL;

-- Add comments to explain the purpose
COMMENT ON COLUMN public.email_sends.campaign_id IS 'Campaign ID for campaign emails, NULL for direct emails';
COMMENT ON COLUMN public.email_sends.contact_id IS 'Contact ID for campaign emails, NULL for direct emails';
COMMENT ON COLUMN public.email_sends.sequence_id IS 'Sequence ID for campaign emails, NULL for direct emails';
COMMENT ON COLUMN public.email_sends.sender_account_id IS 'Sender account ID for campaign emails, NULL for direct emails';
