-- Add email notification settings to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS campaign_notifications_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL;