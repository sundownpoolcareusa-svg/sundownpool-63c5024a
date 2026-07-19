-- Lets a technician view a client's past chemical-reading history (date,
-- readings, products, notes) from the restricted technician chemicals page.
-- Access is gated the same way as the other technician RPCs: the caller
-- must currently be assigned to p_stop_id via their own technician record.

CREATE FUNCTION public.get_my_stop_chemicals_history(p_stop_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  products jsonb,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
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

  RETURN QUERY
  SELECT sc.route_stop_id, r.route_date, sc.free_chlorine, sc.ph, sc.total_alkalinity,
         sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  WHERE rs.client_id = v_client_id
    AND rs.id <> p_stop_id
  ORDER BY r.route_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals_history(uuid) TO authenticated;
