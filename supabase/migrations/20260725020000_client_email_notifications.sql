-- Some clients want to be emailed when their technician is on the way, and
-- again once the visit is done with the chemical readings + a photo. Opt-in
-- per client (owner toggles it in the client cadastro) — most clients don't
-- want this, so it defaults off.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT false;

-- A photo of THIS specific visit (with its own date/time via the stop's
-- completed_at), separate from the client's general pool_photos gallery.
-- *_email_sent_at flags let the sender function run on a cron without
-- double-sending the same visit's emails.
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS visit_photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS on_way_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_email_sent_at TIMESTAMPTZ;

-- Extend get_my_stop_detail with visit_photos so the technician's chemicals
-- page can show/edit the photos already attached to this specific stop.
DROP FUNCTION IF EXISTS public.get_my_stop_detail(uuid);
CREATE FUNCTION public.get_my_stop_detail(p_stop_id uuid)
RETURNS TABLE (
  stop_id uuid,
  "position" int,
  status text,
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_type text,
  filter_last_cleaned_at timestamptz,
  filter_cleaning_count int,
  has_spa boolean,
  has_salt_system boolean,
  visit_photos text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type,
         c.filter_last_cleaned_at, c.filter_cleaning_count, c.has_spa, c.has_salt_system, rs.visit_photos
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_my_stop_visit_photos(p_stop_id uuid, p_photos text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.route_stops rs
  SET visit_photos = p_photos
  FROM public.routes r, public.technicians t
  WHERE rs.id = p_stop_id AND rs.route_id = r.id AND r.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_stop_visit_photos(uuid, text[]) TO authenticated;
