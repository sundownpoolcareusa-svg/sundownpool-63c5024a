-- Lets the technician app prompt for a visit photo right when a stop is
-- marked Concluído (optional — the technician can skip it), instead of the
-- photo only being reachable through the separate Chemicals screen. Needs
-- two new fields on the technician's stop list: whether the client opted
-- into the photo email, and whether a photo has already been attached (so
-- the prompt doesn't reappear for a stop already handled via Chemicals).

-- Postgres won't let CREATE OR REPLACE change a function's column set (only
-- the body) — since these are new output columns, the old signature has to
-- be dropped first.
DROP FUNCTION IF EXISTS public.get_my_technician_stops(date);

CREATE FUNCTION public.get_my_technician_stops(p_date date)
RETURNS TABLE (
  stop_id uuid,
  route_id uuid,
  "position" int,
  scheduled_time time,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  stop_notes text,
  client_id uuid,
  client_name text,
  client_phone text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_lat double precision,
  client_lng double precision,
  client_type text,
  has_chemicals boolean,
  client_notify_photo boolean,
  has_visit_photo boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rs.id, rs.route_id, rs.position, rs.scheduled_time, rs.status, rs.started_at, rs.completed_at, rs.notes,
    c.id, c.name, c.phone, c.address, c.city, c.state, c.zip, c.lat, c.lng, c.client_type,
    EXISTS (SELECT 1 FROM public.stop_chemicals sc WHERE sc.route_stop_id = rs.id),
    c.notify_photo,
    COALESCE(array_length(rs.visit_photos, 1), 0) > 0
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE t.auth_user_id = auth.uid()
    AND r.route_date = p_date
  ORDER BY rs.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_stops(date) TO authenticated;
