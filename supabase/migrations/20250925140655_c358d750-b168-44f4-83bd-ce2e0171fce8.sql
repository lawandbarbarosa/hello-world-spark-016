-- Create email_replies table to store actual reply content
CREATE TABLE public.email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  email_send_id UUID,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_id TEXT,
  in_reply_to TEXT,
  reference_headers TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_replies
CREATE POLICY "Users can view their own email replies" 
ON public.email_replies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email replies" 
ON public.email_replies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email replies" 
ON public.email_replies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email replies" 
ON public.email_replies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_email_replies_user_id ON public.email_replies(user_id);
CREATE INDEX idx_email_replies_contact_id ON public.email_replies(contact_id);
CREATE INDEX idx_email_replies_campaign_id ON public.email_replies(campaign_id);
CREATE INDEX idx_email_replies_received_at ON public.email_replies(received_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_replies_updated_at
BEFORE UPDATE ON public.email_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create the store_email_reply function
CREATE OR REPLACE FUNCTION public.store_email_reply(
  contact_email_param TEXT,
  campaign_id_param UUID,
  from_email_param TEXT,
  to_email_param TEXT,
  subject_param TEXT,
  content_param TEXT,
  message_id_param TEXT DEFAULT NULL,
  in_reply_to_param TEXT DEFAULT NULL,
  references_param TEXT DEFAULT NULL,
  email_send_id_param UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_record RECORD;
  reply_id UUID;
BEGIN
  -- Find the contact and get user_id
  SELECT c.id, c.user_id, c.campaign_id
  INTO contact_record
  FROM contacts c
  WHERE c.email = contact_email_param 
    AND c.campaign_id = campaign_id_param;

  -- If contact not found, return null
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found for email % in campaign %', contact_email_param, campaign_id_param;
  END IF;

  -- Insert the reply
  INSERT INTO email_replies (
    user_id,
    contact_id,
    campaign_id,
    email_send_id,
    from_email,
    to_email,
    subject,
    content,
    message_id,
    in_reply_to,
    reference_headers
  ) VALUES (
    contact_record.user_id,
    contact_record.id,
    campaign_id_param,
    email_send_id_param,
    from_email_param,
    to_email_param,
    subject_param,
    content_param,
    message_id_param,
    in_reply_to_param,
    references_param
  ) RETURNING id INTO reply_id;

  RETURN reply_id;
END;
$function$;