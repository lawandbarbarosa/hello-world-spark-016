-- Create a separate table for direct emails instead of modifying email_sends
-- This preserves the existing campaign functionality while adding direct email support

-- Create direct_emails table for inbox emails
CREATE TABLE public.direct_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for direct_emails
ALTER TABLE public.direct_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for direct_emails
CREATE POLICY "Users can manage their own direct emails" 
ON public.direct_emails 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_direct_emails_user_id ON public.direct_emails(user_id);
CREATE INDEX idx_direct_emails_status ON public.direct_emails(status);
CREATE INDEX idx_direct_emails_message_id ON public.direct_emails(message_id);

-- Add trigger for updated_at
CREATE TRIGGER update_direct_emails_updated_at
BEFORE UPDATE ON public.direct_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add email validation constraint
ALTER TABLE public.direct_emails 
ADD CONSTRAINT valid_to_email_format 
CHECK (is_valid_email(to_email));

ALTER TABLE public.direct_emails 
ADD CONSTRAINT valid_from_email_format 
CHECK (is_valid_email(from_email));
