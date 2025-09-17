-- Add email validation function for better input validation
CREATE OR REPLACE FUNCTION public.is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add email validation constraints (only if they don't exist)
DO $$
BEGIN
  -- Add constraint to contacts table for email validation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_email_format' 
    AND table_name = 'contacts'
  ) THEN
    ALTER TABLE public.contacts 
    ADD CONSTRAINT valid_email_format 
    CHECK (is_valid_email(email));
  END IF;

  -- Add constraint to sender_accounts table for email validation  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_sender_email_format' 
    AND table_name = 'sender_accounts'
  ) THEN
    ALTER TABLE public.sender_accounts 
    ADD CONSTRAINT valid_sender_email_format 
    CHECK (is_valid_email(email));
  END IF;
END $$;

-- Check and add missing RLS policies for email_sends table
DO $$
BEGIN
  -- Add UPDATE policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_sends' 
    AND policyname = 'Users can update email sends for their campaigns'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update email sends for their campaigns" 
    ON public.email_sends 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = email_sends.campaign_id 
        AND campaigns.user_id = auth.uid()
      )
    )';
  END IF;

  -- Add DELETE policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_sends' 
    AND policyname = 'Users can delete email sends for their campaigns'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete email sends for their campaigns" 
    ON public.email_sends 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = email_sends.campaign_id 
        AND campaigns.user_id = auth.uid()
      )
    )';
  END IF;

  -- Add INSERT policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_sends' 
    AND policyname = 'Users can create email sends for their campaigns'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create email sends for their campaigns" 
    ON public.email_sends 
    FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE campaigns.id = email_sends.campaign_id 
        AND campaigns.user_id = auth.uid()
      )
    )';
  END IF;
END $$;