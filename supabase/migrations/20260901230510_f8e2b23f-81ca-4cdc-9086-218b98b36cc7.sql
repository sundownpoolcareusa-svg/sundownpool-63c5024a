ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS default_estimate_notes TEXT;