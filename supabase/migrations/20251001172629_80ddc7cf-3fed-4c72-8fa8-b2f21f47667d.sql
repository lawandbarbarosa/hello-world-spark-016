-- Create scheduling_links table for Calendly-like functionality
CREATE TABLE IF NOT EXISTS public.scheduling_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  available_days TEXT[] NOT NULL DEFAULT ARRAY['monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text, 'friday'::text],
  available_time_start TIME NOT NULL DEFAULT '09:00:00',
  available_time_end TIME NOT NULL DEFAULT '17:00:00',
  link_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_meetings table for prospect bookings
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.scheduling_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_name TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduling_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduling_links
CREATE POLICY "Users can view their own scheduling links"
  ON public.scheduling_links
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduling links"
  ON public.scheduling_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduling links"
  ON public.scheduling_links
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduling links"
  ON public.scheduling_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scheduled_meetings
CREATE POLICY "Users can view their own scheduled meetings"
  ON public.scheduled_meetings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create scheduled meetings"
  ON public.scheduled_meetings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own scheduled meetings"
  ON public.scheduled_meetings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled meetings"
  ON public.scheduled_meetings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_scheduling_links_user_id ON public.scheduling_links(user_id);
CREATE INDEX idx_scheduling_links_link_code ON public.scheduling_links(link_code);
CREATE INDEX idx_scheduled_meetings_user_id ON public.scheduled_meetings(user_id);
CREATE INDEX idx_scheduled_meetings_link_id ON public.scheduled_meetings(link_id);
CREATE INDEX idx_scheduled_meetings_scheduled_date ON public.scheduled_meetings(scheduled_date);

-- Trigger for updated_at
CREATE TRIGGER update_scheduling_links_updated_at
  BEFORE UPDATE ON public.scheduling_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON public.scheduled_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();