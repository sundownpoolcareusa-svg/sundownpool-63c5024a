-- Not every client should see the product quantities/technician notes that
-- got bundled into the chemical-readings email — some only want the plain
-- readings. This is a separate opt-in per client, off by default, checked
-- inside the already-existing chemicals email (it doesn't gate a separate
-- send, just what extra content is included in it).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_chemical_products BOOLEAN NOT NULL DEFAULT false;
