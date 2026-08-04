CREATE OR REPLACE FUNCTION public.reschedule_my_stop(p_stop_id uuid, p_new_date date, p_all_future boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id uuid;
  v_technician_id uuid;
  v_old_date date;
  v_client_id uuid;
  v_new_route_id uuid;
  v_next_position int;
  v_old_weekday text;
  v_new_weekday text;
  v_service_days text[];
  v_weekdays CONSTANT text[] := ARRAY['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
BEGIN
  SELECT rs.route_id, r.technician_id, r.route_date, rs.client_id
  INTO v_route_id, v_technician_id, v_old_date, v_client_id
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id AND t.auth_user_id = auth.uid();

  IF v_route_id IS NULL THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  IF v_old_date = p_new_date THEN
    RETURN;
  END IF;

  SELECT id INTO v_new_route_id FROM public.routes WHERE technician_id = v_technician_id AND route_date = p_new_date;

  IF v_new_route_id IS NULL THEN
    INSERT INTO public.routes (user_id, technician_id, route_date)
    SELECT r.user_id, v_technician_id, p_new_date FROM public.routes r WHERE r.id = v_route_id
    RETURNING id INTO v_new_route_id;
  END IF;

  SELECT COALESCE(MAX(position) + 1, 0) INTO v_next_position FROM public.route_stops WHERE route_id = v_new_route_id;

  UPDATE public.route_stops SET route_id = v_new_route_id, position = v_next_position WHERE id = p_stop_id;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY position) - 1 AS rn FROM public.route_stops WHERE route_id = v_route_id
  )
  UPDATE public.route_stops rs SET position = ranked.rn FROM ranked WHERE rs.id = ranked.id;

  IF p_all_future THEN
    v_old_weekday := v_weekdays[EXTRACT(DOW FROM v_old_date)::int + 1];
    v_new_weekday := v_weekdays[EXTRACT(DOW FROM p_new_date)::int + 1];

    SELECT service_days INTO v_service_days FROM public.clients WHERE id = v_client_id;
    v_service_days := array_remove(v_service_days, v_old_weekday);
    IF NOT (v_new_weekday = ANY(v_service_days)) THEN
      v_service_days := array_append(v_service_days, v_new_weekday);
    END IF;
    UPDATE public.clients SET service_days = v_service_days WHERE id = v_client_id;

    DELETE FROM public.route_stops rs
    WHERE rs.id IN (
      SELECT rs2.id
      FROM public.route_stops rs2
      JOIN public.routes r2 ON r2.id = rs2.route_id
      WHERE rs2.client_id = v_client_id
        AND rs2.status = 'Pendente'
        AND rs2.manual = false
        AND rs2.notes IS NULL
        AND r2.route_date >= current_date
        AND NOT (v_weekdays[EXTRACT(DOW FROM r2.route_date)::int + 1] = ANY(v_service_days))
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_my_stop(uuid, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_my_stop(uuid, date, boolean) TO authenticated;