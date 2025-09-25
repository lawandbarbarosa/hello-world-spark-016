-- Fix RLS policy for email_sends to allow direct email sending
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create email sends for their campaigns" ON email_sends;

-- Create a new policy that allows both campaign emails and direct emails
CREATE POLICY "Users can create email sends" 
ON email_sends 
FOR INSERT 
WITH CHECK (
  -- Allow if it's a campaign email and user owns the campaign
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow if it's a direct email (campaign_id is null) and user is authenticated
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
);