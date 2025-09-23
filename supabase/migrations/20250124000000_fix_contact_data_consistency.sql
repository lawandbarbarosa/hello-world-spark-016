-- Fix contact data consistency by migrating existing data to custom_fields
-- This ensures all contacts have their CSV data properly stored for template processing

-- Update contacts that have data in direct columns but missing in custom_fields
UPDATE public.contacts 
SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || 
  jsonb_build_object(
    'firstName', COALESCE(first_name, ''),
    'lastName', COALESCE(last_name, ''),
    'company', COALESCE(company, '')
  )
WHERE custom_fields IS NULL 
   OR custom_fields = '{}'::jsonb
   OR NOT (custom_fields ? 'firstName' OR custom_fields ? 'lastName' OR custom_fields ? 'company');

-- Also ensure we have the standard field names in custom_fields for consistency
UPDATE public.contacts 
SET custom_fields = custom_fields || 
  jsonb_build_object(
    'first_name', COALESCE(first_name, ''),
    'last_name', COALESCE(last_name, ''),
    'company', COALESCE(company, '')
  )
WHERE custom_fields IS NOT NULL 
  AND custom_fields != '{}'::jsonb
  AND (NOT (custom_fields ? 'first_name') OR NOT (custom_fields ? 'last_name') OR NOT (custom_fields ? 'company'));

-- Create a function to help debug contact data structure
CREATE OR REPLACE FUNCTION public.debug_contact_data(contact_id_param UUID)
RETURNS TABLE (
  contact_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  custom_fields JSONB,
  has_custom_fields BOOLEAN,
  custom_fields_keys TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    c.company,
    c.custom_fields,
    (c.custom_fields IS NOT NULL AND c.custom_fields != '{}'::jsonb) as has_custom_fields,
    CASE 
      WHEN c.custom_fields IS NOT NULL THEN 
        ARRAY(SELECT jsonb_object_keys(c.custom_fields))
      ELSE 
        ARRAY[]::TEXT[]
    END as custom_fields_keys
  FROM public.contacts c
  WHERE c.id = contact_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get contact data for template processing
CREATE OR REPLACE FUNCTION public.get_contact_for_template(contact_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  custom_fields JSONB,
  all_fields JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    c.company,
    c.custom_fields,
    -- Combine all fields into a single JSONB object for easier template processing
    jsonb_build_object(
      'id', c.id,
      'email', c.email,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'company', c.company,
      'firstName', c.first_name,
      'lastName', c.last_name
    ) || COALESCE(c.custom_fields, '{}'::jsonb) as all_fields
  FROM public.contacts c
  WHERE c.id = contact_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the migration
COMMENT ON FUNCTION public.debug_contact_data(UUID) IS 'Debug function to inspect contact data structure and custom_fields';
COMMENT ON FUNCTION public.get_contact_for_template(UUID) IS 'Get contact data optimized for template processing with all fields combined';
