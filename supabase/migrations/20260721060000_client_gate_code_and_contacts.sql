-- Some clients have a gate code and/or an assistant/secondary contact
-- (e.g. a property manager) the owner needs on file alongside the client's
-- own info. Stored directly on clients since it's a small, owner-only detail.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gate_code text,
  ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
