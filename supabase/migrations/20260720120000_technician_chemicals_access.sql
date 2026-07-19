-- Adds client_type to the technician's stop list (for the pool-type tag in
-- the UI) and lets a technician read/log chemical readings for their OWN
-- stops only — needed so the "Chemicals" flow works from the restricted
-- technician login, not just the owner's full admin dashboard.

CREATE OR REPLACE FUNCTION public.get_my_technician_stops(p_date date)
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
  has_chemicals boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rs.id, rs.route_id, rs.position, rs.scheduled_time, rs.status, rs.started_at, rs.completed_at, rs.notes,
    c.id, c.name, c.phone, c.address, c.city, c.state, c.zip, c.lat, c.lng, c.client_type,
    EXISTS (SELECT 1 FROM public.stop_chemicals sc WHERE sc.route_stop_id = rs.id)
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE t.auth_user_id = auth.uid()
    AND r.route_date = p_date
  ORDER BY rs.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_stops(date) TO authenticated;

-- Single-stop lookup for a technician (used by the Chemicals page, which
-- only has the stop id to go on — no date in the URL).
CREATE OR REPLACE FUNCTION public.get_my_stop_detail(p_stop_id uuid)
RETURNS TABLE (
  stop_id uuid,
  "position" int,
  status text,
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;

-- Read a technician's own logged chemical reading for one of their stops.
CREATE OR REPLACE FUNCTION public.get_my_stop_chemicals(p_stop_id uuid)
RETURNS TABLE (
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  products jsonb,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals(uuid) TO authenticated;

-- Save a technician's own chemical reading for one of their stops.
CREATE OR REPLACE FUNCTION public.save_my_stop_chemicals(
  p_stop_id uuid,
  p_free_chlorine numeric,
  p_ph numeric,
  p_total_alkalinity numeric,
  p_calcium_hardness numeric,
  p_stabilizer numeric,
  p_products jsonb,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    JOIN public.technicians t ON t.id = r.technician_id
    WHERE rs.id = p_stop_id AND t.auth_user_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  INSERT INTO public.stop_chemicals (route_stop_id, free_chlorine, ph, total_alkalinity, calcium_hardness, stabilizer, products, notes)
  VALUES (p_stop_id, p_free_chlorine, p_ph, p_total_alkalinity, p_calcium_hardness, p_stabilizer, COALESCE(p_products, '[]'::jsonb), p_notes)
  ON CONFLICT (route_stop_id) DO UPDATE SET
    free_chlorine = excluded.free_chlorine,
    ph = excluded.ph,
    total_alkalinity = excluded.total_alkalinity,
    calcium_hardness = excluded.calcium_hardness,
    stabilizer = excluded.stabilizer,
    products = excluded.products,
    notes = excluded.notes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_stop_chemicals(uuid, numeric, numeric, numeric, numeric, numeric, jsonb, text) TO authenticated;
