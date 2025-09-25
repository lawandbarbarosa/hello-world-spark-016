-- Fix RLS policy for direct emails (non-campaign emails)
-- Allow users to create email sends for direct emails (campaign_id = null)

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create email sends for their campaigns" ON public.email_sends;

-- Create a new INSERT policy that allows both campaign emails and direct emails
CREATE POLICY "Users can create email sends for their campaigns and direct emails" 
ON public.email_sends 
FOR INSERT 
WITH CHECK (
  -- Allow campaign emails (campaign_id is not null and belongs to user)
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow direct emails (campaign_id is null)
  (campaign_id IS NULL)
);

-- Also update the UPDATE policy to handle direct emails
DROP POLICY IF EXISTS "Users can update email sends for their campaigns" ON public.email_sends;

CREATE POLICY "Users can update email sends for their campaigns and direct emails" 
ON public.email_sends 
FOR UPDATE 
USING (
  -- Allow updates for campaign emails
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow updates for direct emails (campaign_id is null)
  (campaign_id IS NULL)
);

-- Also update the DELETE policy to handle direct emails
DROP POLICY IF EXISTS "Users can delete email sends for their campaigns" ON public.email_sends;

CREATE POLICY "Users can delete email sends for their campaigns and direct emails" 
ON public.email_sends 
FOR DELETE 
USING (
  -- Allow deletes for campaign emails
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow deletes for direct emails (campaign_id is null)
  (campaign_id IS NULL)
);
