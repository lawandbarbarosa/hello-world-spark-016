-- Add custom_fields JSON column to contacts table to store all CSV data
ALTER TABLE public.contacts ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;

-- Create index for better performance on custom_fields queries
CREATE INDEX idx_contacts_custom_fields ON public.contacts USING GIN (custom_fields);