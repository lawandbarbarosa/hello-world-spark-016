-- Add scheduled date and time columns to email_sequences table
ALTER TABLE public.email_sequences 
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time TIME;