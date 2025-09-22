-- Update default timezone for user_settings to Asia/Baghdad (Kurdistan region)
ALTER TABLE user_settings ALTER COLUMN timezone SET DEFAULT 'Asia/Baghdad';

-- Update existing users who have UTC timezone to use Asia/Baghdad
UPDATE user_settings 
SET timezone = 'Asia/Baghdad' 
WHERE timezone = 'UTC' OR timezone IS NULL;