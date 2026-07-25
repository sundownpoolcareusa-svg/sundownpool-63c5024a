-- Lets the owner mark their own technician record (if they have one — some
-- owners also run routes themselves) as "Master" so the Users admin page can
-- list them separately from regular employees. Purely a display grouping for
-- now — no permission enforcement changes yet.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;
