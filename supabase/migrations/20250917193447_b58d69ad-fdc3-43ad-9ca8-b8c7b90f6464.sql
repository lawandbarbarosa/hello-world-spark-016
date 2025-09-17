-- Add replied_at column to contacts table to track when a contact replied
ALTER TABLE public.contacts 
ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better performance when querying replied contacts
CREATE INDEX idx_contacts_replied_at ON public.contacts(replied_at);

-- Add a function to mark contact as replied
CREATE OR REPLACE FUNCTION public.mark_contact_replied(contact_email text, campaign_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contacts 
  SET replied_at = now()
  WHERE email = contact_email 
    AND campaign_id = campaign_id_param 
    AND replied_at IS NULL;
END;
$$;