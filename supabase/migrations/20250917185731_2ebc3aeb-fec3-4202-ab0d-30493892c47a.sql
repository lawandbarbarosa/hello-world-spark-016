-- Create user settings table for storing application preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- General Settings
  timezone TEXT DEFAULT 'UTC',
  theme_mode TEXT DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  
  -- Sending Settings
  daily_send_limit INTEGER DEFAULT 50 CHECK (daily_send_limit > 0),
  send_time_start TIME DEFAULT '08:00:00',
  send_time_end TIME DEFAULT '18:00:00',
  reply_handling_enabled BOOLEAN DEFAULT true,
  
  -- Contact & Personalization Settings
  csv_mapping_defaults JSONB DEFAULT '{}',
  fallback_merge_tags JSONB DEFAULT '{"first_name": "there", "company": "your company"}',
  
  -- Email Composition Settings
  default_signature TEXT DEFAULT '',
  from_name_format TEXT DEFAULT 'first_last' CHECK (from_name_format IN ('first_last', 'company_team')),
  
  -- Security & Compliance
  unsubscribe_link_enabled BOOLEAN DEFAULT true,
  legal_disclaimer TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize default settings for new users
CREATE OR REPLACE FUNCTION public.initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger to initialize settings when a new user profile is created
CREATE TRIGGER initialize_user_settings_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_settings();