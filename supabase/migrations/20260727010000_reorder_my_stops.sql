-- Lets a technician drag-reorder their own day's stops. reorderStops()
-- (the admin version) does a plain REST update, which route_stops' RLS
-- only allows for the route's owner — a technician's auth.uid() never
-- matches that, so it would silently no-op for them. This RPC checks
-- ownership the same way update_my_stop_status does instead.
CREATE OR REPLACE FUNCTION public.reorder_my_stops(p_stop_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_count int;
BEGIN
  SELECT count(*) INTO v_valid_count
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = ANY(p_stop_ids)
    AND t.auth_user_id = auth.uid();

  IF v_valid_count <> array_length(p_stop_ids, 1) THEN
    RAISE EXCEPTION 'One or more stops not assigned to you';
  END IF;

  UPDATE public.route_stops rs
  SET position = x.ord - 1
  FROM unnest(p_stop_ids) WITH ORDINALITY AS x(stop_id, ord)
  WHERE rs.id = x.stop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_my_stops(uuid[]) TO authenticated;
