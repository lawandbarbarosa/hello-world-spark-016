-- Create a table to track scheduled follow-up emails
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  sender_account_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'cancelled'
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled_emails
CREATE POLICY "Users can manage scheduled emails for their campaigns" 
ON public.scheduled_emails 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaigns 
  WHERE campaigns.id = scheduled_emails.campaign_id 
  AND campaigns.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_emails_updated_at
BEFORE UPDATE ON public.scheduled_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying of scheduled emails
CREATE INDEX idx_scheduled_emails_ready ON public.scheduled_emails (scheduled_for, status) 
WHERE status = 'scheduled';

CREATE INDEX idx_scheduled_emails_campaign ON public.scheduled_emails (campaign_id, contact_id);