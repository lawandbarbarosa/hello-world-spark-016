-- Add email open notification setting to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS open_notifications_enabled boolean DEFAULT false;