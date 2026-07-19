-- The recurring-schedule auto-add was client-side only, on the OWNER's
-- Route Planner page — it only ever created a stop for a given date once
-- someone loaded that exact date in THAT page. The technician's own login
-- has no write access to routes/clients (by design), so if the owner never
-- happened to open a given day first, the technician would see nothing
-- there even though the client is clearly scheduled for that weekday.
--
-- This RPC lets a technician's own login ensure their day's recurring
-- stops exist before reading them, so it's genuinely automatic regardless
-- of who opens the app first.
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
