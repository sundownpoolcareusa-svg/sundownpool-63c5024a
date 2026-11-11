ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS email_display_name TEXT;