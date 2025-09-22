-- Create email_replies table to store actual reply content
CREATE TABLE public.email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  email_send_id UUID, -- Reference to the original email that was replied to
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_id TEXT,
  in_reply_to TEXT,
  references TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_email_replies_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_email_replies_contact_id FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_email_replies_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_email_replies_email_send_id FOREIGN KEY (email_send_id) REFERENCES public.email_sends(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for email_replies
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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_replies_updated_at
BEFORE UPDATE ON public.email_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_email_replies_user_id ON public.email_replies(user_id);
CREATE INDEX idx_email_replies_contact_id ON public.email_replies(contact_id);
CREATE INDEX idx_email_replies_campaign_id ON public.email_replies(campaign_id);
CREATE INDEX idx_email_replies_email_send_id ON public.email_replies(email_send_id);
CREATE INDEX idx_email_replies_received_at ON public.email_replies(received_at DESC);
CREATE INDEX idx_email_replies_from_email ON public.email_replies(from_email);

-- Add a function to store email reply
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
AS $$
DECLARE
  contact_record RECORD;
  reply_id UUID;
BEGIN
  -- Get the contact and user_id
  SELECT id, user_id INTO contact_record
  FROM public.contacts 
  WHERE email = contact_email_param 
    AND campaign_id = campaign_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found for email % in campaign %', contact_email_param, campaign_id_param;
  END IF;
  
  -- Insert the reply
  INSERT INTO public.email_replies (
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
    references
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
$$;

-- Add a function to get replies for a contact
CREATE OR REPLACE FUNCTION public.get_contact_replies(contact_email_param TEXT, campaign_id_param UUID)
RETURNS TABLE (
  id UUID,
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  content TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  message_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.from_email,
    er.to_email,
    er.subject,
    er.content,
    er.received_at,
    er.message_id
  FROM public.email_replies er
  JOIN public.contacts c ON er.contact_id = c.id
  WHERE c.email = contact_email_param 
    AND c.campaign_id = campaign_id_param
    AND er.user_id = auth.uid()
  ORDER BY er.received_at DESC;
END;
$$;
