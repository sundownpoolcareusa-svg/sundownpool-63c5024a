-- Lets a technician sign in with their own Supabase Auth account and see ONLY
-- their own day's route stops (no Clients/Estimates/Invoices, no financial
-- fields) — the owner's existing full-access tables/policies are untouched.

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS technicians_auth_user_id_key
  ON public.technicians(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- A technician needs to read their own technicians row (to know their name and
-- that they ARE a technician) even though it belongs to the owner's account.
CREATE POLICY "technician can read own record" ON public.technicians
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Returns only the fields a technician needs to run their route for a given
-- date — no monthly_value/email/pool_photos/etc, and no rows outside their
-- own assigned stops. SECURITY DEFINER so it can read across the owner's
-- clients/routes/route_stops tables without granting the technician's login
-- any direct RLS access to those tables.
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
  has_chemicals boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rs.id, rs.route_id, rs.position, rs.scheduled_time, rs.status, rs.started_at, rs.completed_at, rs.notes,
    c.id, c.name, c.phone, c.address, c.city, c.state, c.zip, c.lat, c.lng,
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

-- Lets a technician update the status of ONLY their own stops (start/complete),
-- nothing else about the route, client, or other technicians' stops.
CREATE OR REPLACE FUNCTION public.update_my_stop_status(p_stop_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('Pendente', 'Em serviço', 'Concluído') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.route_stops rs
  SET status = p_status,
      started_at = CASE WHEN p_status = 'Em serviço' AND rs.started_at IS NULL THEN now() ELSE rs.started_at END,
      completed_at = CASE WHEN p_status = 'Concluído' THEN now() ELSE rs.completed_at END
  FROM public.routes r
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.route_id = r.id
    AND rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  IF p_status = 'Concluído' THEN
    UPDATE public.clients c
    SET last_service_date = current_date
    FROM public.route_stops rs
    WHERE rs.id = p_stop_id AND c.id = rs.client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_stop_status(uuid, text) TO authenticated;
