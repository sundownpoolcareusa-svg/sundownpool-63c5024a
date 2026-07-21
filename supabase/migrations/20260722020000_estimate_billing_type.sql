-- Lets an estimate's total be labeled as a one-time total or a recurring
-- monthly payment (e.g. ongoing pool maintenance), so the client viewing
-- the estimate understands which one they're being quoted.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'total';
