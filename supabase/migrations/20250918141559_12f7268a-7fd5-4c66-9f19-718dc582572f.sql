-- Create spam_emails table
CREATE TABLE public.spam_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT,
  original_message_id TEXT,
  campaign_id UUID,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_spam_emails_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_spam_emails_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.spam_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for spam_emails
CREATE POLICY "Users can view their own spam emails" 
ON public.spam_emails 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spam emails" 
ON public.spam_emails 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spam emails" 
ON public.spam_emails 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spam emails" 
ON public.spam_emails 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_spam_emails_updated_at
BEFORE UPDATE ON public.spam_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_spam_emails_user_id ON public.spam_emails(user_id);
CREATE INDEX idx_spam_emails_received_at ON public.spam_emails(received_at DESC);

-- Insert some sample spam emails for testing
INSERT INTO public.spam_emails (user_id, subject, sender_email, content, received_at) VALUES
((SELECT auth.uid()), 'URGENT: Claim your prize now!', 'noreply@suspicious-site.com', 'You have won $1,000,000! Click here to claim your prize immediately. This offer expires in 24 hours!', now() - interval '2 hours'),
((SELECT auth.uid()), 'Your account has been compromised', 'security@fake-bank.com', 'We detected suspicious activity on your account. Please verify your identity immediately by clicking this link.', now() - interval '1 day'),
((SELECT auth.uid()), 'Amazing weight loss secret doctors hate!', 'health@miracle-pills.net', 'Lose 30 pounds in 30 days with this one weird trick! No diet or exercise required.', now() - interval '3 hours'),
((SELECT auth.uid()), 'Re: Your PayPal account is suspended', 'support@payp4l-security.com', 'Your PayPal account has been temporarily suspended due to unusual activity. Click here to restore access.', now() - interval '5 hours');