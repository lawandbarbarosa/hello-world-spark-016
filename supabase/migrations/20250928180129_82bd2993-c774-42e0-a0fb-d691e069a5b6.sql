-- Add email_column field to campaigns table
ALTER TABLE campaigns 
ADD COLUMN email_column text DEFAULT 'email';

-- Update existing campaigns to use 'email' as default
UPDATE campaigns 
SET email_column = 'email' 
WHERE email_column IS NULL;