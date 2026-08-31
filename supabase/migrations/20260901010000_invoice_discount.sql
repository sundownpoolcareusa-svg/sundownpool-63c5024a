-- Owner needs an optional discount on invoices (not just estimates) — off
-- by default, only subtracted from the total when explicitly enabled via a
-- checkbox in the invoice form.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
