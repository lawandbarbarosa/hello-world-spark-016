-- Create email templates table to store reusable email sequences
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  campaign_name TEXT, -- Original campaign name for reference
  template_data JSONB NOT NULL, -- Stores the complete email sequence data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN DEFAULT false, -- Allow sharing templates with team
  tags TEXT[] DEFAULT '{}' -- For categorization and search
);

-- Enable RLS for email templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email templates
CREATE POLICY "Users can view their own email templates" 
ON public.email_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email templates" 
ON public.email_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email templates" 
ON public.email_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX idx_email_templates_name ON public.email_templates(name);
CREATE INDEX idx_email_templates_tags ON public.email_templates USING GIN(tags);
CREATE INDEX idx_email_templates_created_at ON public.email_templates(created_at DESC);

-- Create function to save email template from campaign
CREATE OR REPLACE FUNCTION public.save_email_template(
  template_name_param TEXT,
  template_description_param TEXT,
  campaign_name_param TEXT,
  template_data_param JSONB,
  tags_param TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  template_id UUID;
BEGIN
  INSERT INTO public.email_templates (
    user_id,
    name,
    description,
    campaign_name,
    template_data,
    tags
  ) VALUES (
    auth.uid(),
    template_name_param,
    template_description_param,
    campaign_name_param,
    template_data_param,
    tags_param
  ) RETURNING id INTO template_id;
  
  RETURN template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's email templates
CREATE OR REPLACE FUNCTION public.get_user_email_templates()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  campaign_name TEXT,
  template_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.name,
    et.description,
    et.campaign_name,
    et.template_data,
    et.created_at,
    et.updated_at,
    et.tags
  FROM public.email_templates et
  WHERE et.user_id = auth.uid()
  ORDER BY et.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search email templates
CREATE OR REPLACE FUNCTION public.search_email_templates(
  search_term_param TEXT DEFAULT '',
  tags_filter_param TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  campaign_name TEXT,
  template_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.name,
    et.description,
    et.campaign_name,
    et.template_data,
    et.created_at,
    et.updated_at,
    et.tags
  FROM public.email_templates et
  WHERE et.user_id = auth.uid()
    AND (
      search_term_param = '' OR
      et.name ILIKE '%' || search_term_param || '%' OR
      et.description ILIKE '%' || search_term_param || '%' OR
      et.campaign_name ILIKE '%' || search_term_param || '%'
    )
    AND (
      array_length(tags_filter_param, 1) IS NULL OR
      et.tags && tags_filter_param
    )
  ORDER BY et.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the table
COMMENT ON TABLE public.email_templates IS 'Stores reusable email templates/sequences from previous campaigns';
COMMENT ON FUNCTION public.save_email_template IS 'Save an email template from a campaign for future reuse';
COMMENT ON FUNCTION public.get_user_email_templates IS 'Get all email templates for the current user';
COMMENT ON FUNCTION public.search_email_templates IS 'Search email templates by name, description, or tags';
