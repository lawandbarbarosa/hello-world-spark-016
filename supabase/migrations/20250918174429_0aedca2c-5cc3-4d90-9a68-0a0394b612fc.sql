-- Create email_verifications table to store NeverBounce verification results
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_result TEXT NOT NULL CHECK (verification_result IN ('valid', 'invalid', 'disposable', 'catchall', 'unknown', 'error')),
  is_valid BOOLEAN NOT NULL DEFAULT false,
  is_deliverable BOOLEAN NOT NULL DEFAULT false,
  flags TEXT[] DEFAULT '{}',
  suggested_correction TEXT,
  execution_time_ms INTEGER,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for email_verifications table
CREATE POLICY "Users can view their own email verifications" 
ON public.email_verifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email verifications" 
ON public.email_verifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email verifications" 
ON public.email_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email verifications" 
ON public.email_verifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_email_verifications_user_id ON public.email_verifications(user_id);
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX idx_email_verifications_result ON public.email_verifications(verification_result);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_verifications_updated_at
BEFORE UPDATE ON public.email_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();