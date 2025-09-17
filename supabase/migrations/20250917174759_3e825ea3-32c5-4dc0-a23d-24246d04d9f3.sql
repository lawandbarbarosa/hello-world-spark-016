-- Fix critical RLS gap on email_sends table
-- Add missing INSERT, UPDATE, and DELETE policies

-- Policy for INSERT: Allow users to create email sends for their own campaigns
CREATE POLICY "Users can create email sends for their campaigns" 
ON public.email_sends 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Policy for UPDATE: Allow users to update email sends for their campaigns
CREATE POLICY "Users can update email sends for their campaigns" 
ON public.email_sends 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Policy for DELETE: Allow users to delete email sends for their campaigns
CREATE POLICY "Users can delete email sends for their campaigns" 
ON public.email_sends 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Add email validation function for better input validation
CREATE OR REPLACE FUNCTION public.is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to contacts table for email validation
ALTER TABLE public.contacts 
ADD CONSTRAINT valid_email_format 
CHECK (is_valid_email(email));

-- Add constraint to sender_accounts table for email validation
ALTER TABLE public.sender_accounts 
ADD CONSTRAINT valid_sender_email_format 
CHECK (is_valid_email(email));