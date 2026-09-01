-- Lets the owner save whatever they last typed into an estimate's Notes
-- field as the default that pre-fills future new estimates, instead of
-- retyping/pasting it every time.
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS default_estimate_notes TEXT;
