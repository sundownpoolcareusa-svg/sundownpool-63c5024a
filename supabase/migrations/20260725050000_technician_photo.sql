-- Lets the owner attach a headshot to a technician record, shown in place
-- of the initials-circle avatar wherever the technician appears (their own
-- app header, the owner's Technicians page, route lists, dashboard). Stored
-- as a storage path in the existing client-photos bucket (same as pool/
-- equipment/visit photos), not a public URL, so it's resolved to a signed
-- URL on render like every other photo in the app.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS photo_path TEXT;
