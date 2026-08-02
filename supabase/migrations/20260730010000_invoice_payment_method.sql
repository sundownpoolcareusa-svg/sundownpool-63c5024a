-- Records how an invoice was paid (Stripe/Zelle/Cash/Cheque) so it can be
-- shown alongside the Paid badge instead of just knowing *that* it was paid.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
