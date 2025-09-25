-- Comprehensive fix for RLS policies to handle both campaign emails and direct emails
-- This migration ensures that all operations work correctly with nullable foreign keys

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create email sends for their campaigns and direct emails" ON public.email_sends;
DROP POLICY IF EXISTS "Users can view email sends for their campaigns and direct emails" ON public.email_sends;
DROP POLICY IF EXISTS "Users can update email sends for their campaigns and direct emails" ON public.email_sends;
DROP POLICY IF EXISTS "Users can delete email sends for their campaigns and direct emails" ON public.email_sends;

-- Create comprehensive INSERT policy
CREATE POLICY "email_sends_insert_policy" 
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
  -- Allow direct emails (campaign_id is null) - authenticated users can send direct emails
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Create comprehensive SELECT policy
CREATE POLICY "email_sends_select_policy" 
ON public.email_sends 
FOR SELECT 
USING (
  -- Allow viewing campaign emails that belong to the user
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow viewing direct emails (campaign_id is null) - authenticated users can view their direct emails
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Create comprehensive UPDATE policy
CREATE POLICY "email_sends_update_policy" 
ON public.email_sends 
FOR UPDATE 
USING (
  -- Allow updating campaign emails that belong to the user
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow updating direct emails (campaign_id is null) - authenticated users can update their direct emails
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  -- Same conditions for the updated record
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Create comprehensive DELETE policy
CREATE POLICY "email_sends_delete_policy" 
ON public.email_sends 
FOR DELETE 
USING (
  -- Allow deleting campaign emails that belong to the user
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  ))
  OR
  -- Allow deleting direct emails (campaign_id is null) - authenticated users can delete their direct emails
  (campaign_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Add comments to explain the policies
COMMENT ON POLICY "email_sends_insert_policy" ON public.email_sends IS 'Allows users to create email sends for their campaigns or direct emails';
COMMENT ON POLICY "email_sends_select_policy" ON public.email_sends IS 'Allows users to view email sends for their campaigns or direct emails';
COMMENT ON POLICY "email_sends_update_policy" ON public.email_sends IS 'Allows users to update email sends for their campaigns or direct emails';
COMMENT ON POLICY "email_sends_delete_policy" ON public.email_sends IS 'Allows users to delete email sends for their campaigns or direct emails';
