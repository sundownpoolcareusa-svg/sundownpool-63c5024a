
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS monthly_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_photos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equipment_photos text[] NOT NULL DEFAULT '{}'::text[];
