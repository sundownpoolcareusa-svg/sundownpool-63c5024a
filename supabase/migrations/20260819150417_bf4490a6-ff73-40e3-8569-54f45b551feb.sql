ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_chemical_products BOOLEAN NOT NULL DEFAULT false;