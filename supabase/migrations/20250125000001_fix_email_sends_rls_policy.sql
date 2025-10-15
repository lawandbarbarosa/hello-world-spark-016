-- Fix RLS policy for email_sends table to allow viewing direct emails (NULL campaign_id)
-- This migration addresses the issue where direct emails sent from Inbox/Compose
-- are not visible in the dashboard because they have campaign_id = NULL

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view email sends for their campaigns" ON public.email_sends;

-- Create a new comprehensive policy that handles both campaign emails and direct emails
CREATE POLICY "Users can view their own email sends" 
ON public.email_sends 
FOR SELECT 
USING (
  -- For campaign emails: check if user owns the campaign
  (
    campaign_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = email_sends.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  )
  OR
  -- For direct emails: check if user owns the sender account
  (
    campaign_id IS NULL 
    AND sender_account_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sender_accounts 
      WHERE sender_accounts.id = email_sends.sender_account_id 
      AND sender_accounts.user_id = auth.uid()
    )
  )
  OR
  -- For direct emails without sender_account_id: check if user has any sender accounts
  -- This handles edge cases where direct emails might not have sender_account_id set
  (
    campaign_id IS NULL 
    AND sender_account_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.sender_accounts 
      WHERE sender_accounts.user_id = auth.uid()
    )
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view their own email sends" ON public.email_sends IS 
'Allows users to view email_sends records for their campaigns and direct emails sent from their sender accounts';

-- Create index for better performance on the new policy queries
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_user_lookup ON public.email_sends(campaign_id) 
WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_sends_sender_user_lookup ON public.email_sends(sender_account_id) 
WHERE sender_account_id IS NOT NULL;
