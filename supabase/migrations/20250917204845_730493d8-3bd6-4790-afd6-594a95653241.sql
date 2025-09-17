-- Add sending_days column to user_settings table
ALTER TABLE user_settings ADD COLUMN sending_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];