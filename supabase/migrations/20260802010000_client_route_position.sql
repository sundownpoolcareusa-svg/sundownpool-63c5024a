-- Both the admin's Rotas auto-schedule sweep and the technician's own
-- ensure_my_technician_stops RPC add a client's recurring stop to a fresh
-- day's route with no deliberate ordering — the admin sweep dispatches
-- inserts in parallel (so completion order, and therefore position, is a
-- race) and the RPC's client cursor has no ORDER BY at all. So a manually
-- fixed route order on one day never carried over to the next matching
-- weekday, and had to be redone every time.
--
-- route_position records the last position a client's stop was manually
-- confirmed at within its technician's route. Auto-scheduling now sorts by
-- it (nulls last, so a client who's never been reordered just lands at the
-- end) instead of relying on insert-completion order.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS route_position INTEGER;

-- Technician-side reorder (drag-and-drop in /tecnico) now also remembers
-- the resulting order per client, not just per stop-for-that-day.
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

  UPDATE public.clients c
  SET route_position = x.ord - 1
  FROM unnest(p_stop_ids) WITH ORDINALITY AS x(stop_id, ord)
  JOIN public.route_stops rs ON rs.id = x.stop_id
  WHERE c.id = rs.client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_my_stops(uuid[]) TO authenticated;

-- Iterate candidate clients in route_position order (nulls last) instead of
-- whatever arbitrary order Postgres happens to return them in, so newly
-- auto-created stops land in the last confirmed order.
CREATE OR REPLACE FUNCTION public.ensure_my_technician_stops(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tech_id uuid;
  v_owner_id uuid;
  v_weekday text;
  v_route_id uuid;
  v_client_id uuid;
BEGIN
  SELECT id, user_id INTO v_tech_id, v_owner_id
  FROM public.technicians
  WHERE auth_user_id = auth.uid();

  IF v_tech_id IS NULL THEN
    RETURN;
  END IF;

  v_weekday := (ARRAY['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[extract(dow from p_date)::int + 1];

  FOR v_client_id IN
    SELECT c.id
    FROM public.clients c
    WHERE c.technician_id = v_tech_id
      AND c.status <> 'Inativo'
      AND c.service_days IS NOT NULL
      AND v_weekday = ANY(c.service_days)
      AND NOT EXISTS (
        SELECT 1 FROM public.route_stops rs
        JOIN public.routes r ON r.id = rs.route_id
        WHERE r.technician_id = v_tech_id AND r.route_date = p_date AND rs.client_id = c.id
      )
    ORDER BY c.route_position NULLS LAST, c.name
  LOOP
    SELECT id INTO v_route_id FROM public.routes WHERE technician_id = v_tech_id AND route_date = p_date;
    IF v_route_id IS NULL THEN
      INSERT INTO public.routes (user_id, technician_id, route_date)
      VALUES (v_owner_id, v_tech_id, p_date)
      ON CONFLICT (technician_id, route_date) DO UPDATE SET route_date = excluded.route_date
      RETURNING id INTO v_route_id;
    END IF;

    INSERT INTO public.route_stops (route_id, client_id, position)
    SELECT v_route_id, v_client_id, COALESCE((SELECT MAX(position) + 1 FROM public.route_stops WHERE route_id = v_route_id), 0)
    ON CONFLICT (route_id, client_id) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_technician_stops(date) TO authenticated;
