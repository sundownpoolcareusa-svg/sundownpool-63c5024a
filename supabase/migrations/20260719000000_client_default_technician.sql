-- Default technician per client, so recurring service days can auto-populate
-- that technician's route every week without the owner re-adding the client
-- by hand each time.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL;
