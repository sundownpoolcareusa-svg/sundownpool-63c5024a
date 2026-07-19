-- Filter cleaning tracking on clients (last cleaned timestamp + running count),
-- surfaced on the Pool Chemicals page for both the owner and technicians.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS filter_last_cleaned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS filter_cleaning_count INT NOT NULL DEFAULT 0;

-- Technician RPC: log a filter cleaning for the client tied to one of the
-- technician's own stops. Same ownership check as save_my_stop_chemicals.
CREATE FUNCTION public.log_my_stop_filter_cleaning(p_stop_id uuid)
RETURNS TABLE (
  filter_last_cleaned_at timestamptz,
  filter_cleaning_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT rs.client_id INTO v_client_id
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  UPDATE public.clients
  SET filter_last_cleaned_at = now(),
      filter_cleaning_count = filter_cleaning_count + 1
  WHERE id = v_client_id;

  RETURN QUERY
  SELECT c.filter_last_cleaned_at, c.filter_cleaning_count
  FROM public.clients c
  WHERE c.id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_my_stop_filter_cleaning(uuid) TO authenticated;

-- Surface the filter fields (and stop_id/client_id, needed by the owner-side
-- Filter Cleaning card) on the technician's single-stop lookup.
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
  filter_cleaning_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type,
         c.filter_last_cleaned_at, c.filter_cleaning_count
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;
