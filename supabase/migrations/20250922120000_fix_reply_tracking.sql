-- Fix reply tracking issues
-- Ensure the mark_contact_replied function is properly set up

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.mark_contact_replied(text, uuid);

CREATE OR REPLACE FUNCTION public.mark_contact_replied(contact_email text, campaign_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the contact's replied_at timestamp
  UPDATE public.contacts 
  SET replied_at = now()
  WHERE email = contact_email 
    AND campaign_id = campaign_id_param 
    AND replied_at IS NULL;
    
  -- Log the update for debugging
  IF FOUND THEN
    RAISE NOTICE 'Successfully marked contact % as replied for campaign %', contact_email, campaign_id_param;
  ELSE
    RAISE NOTICE 'No contact found with email % in campaign % or already replied', contact_email, campaign_id_param;
  END IF;
END;
$$;

-- Ensure the replied_at column exists and has proper indexing
DO $$ 
BEGIN
  -- Add replied_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' 
    AND column_name = 'replied_at'
  ) THEN
    ALTER TABLE public.contacts 
    ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

-- Ensure index exists for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_replied_at ON public.contacts(replied_at);
CREATE INDEX IF NOT EXISTS idx_contacts_email_campaign ON public.contacts(email, campaign_id);

-- Add a function to get reply statistics
CREATE OR REPLACE FUNCTION public.get_reply_stats(campaign_id_param uuid)
RETURNS TABLE(
  total_contacts bigint,
  replied_contacts bigint,
  reply_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_contacts,
    COUNT(replied_at) as replied_contacts,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(replied_at)::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0
    END as reply_rate
  FROM public.contacts 
  WHERE campaign_id = campaign_id_param;
END;
$$;
