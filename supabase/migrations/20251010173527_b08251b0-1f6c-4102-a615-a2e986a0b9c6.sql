-- Add scheduled email notifications setting to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS scheduled_email_notifications_enabled boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.user_settings.scheduled_email_notifications_enabled IS 'Enable notifications when scheduled follow-up emails are sent';