-- Some accounts need two different names: the legal entity name shown on
-- invoices/estimates (e.g. "Sundown ITC LLC", what a client needs to know
-- to pay by check/Zelle) and a friendlier brand name used in the automated
-- client emails (on-the-way/chemicals/photo/receipt — e.g.
-- "Sundown Pool Care"). Previously both shared business_profiles.
-- company_name, which meant fixing one broke the other. This new column
-- is optional and only overrides the email-signature name — falls back to
-- company_name, then the hardcoded default, exactly as before, when unset.
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS email_display_name TEXT;
