-- Some pools use a salt chlorinator and need salt level (ppm) tracked
-- alongside the other chemical readings, plus a "Salt Bag" product option
-- (already supported generically via the products jsonb array — only the
-- dedicated reading column and its RPC plumbing need to be added).

ALTER TABLE public.stop_chemicals
  ADD COLUMN IF NOT EXISTS salt NUMERIC;

-- Return columns change, so CREATE OR REPLACE can't be used for these two.
DROP FUNCTION IF EXISTS public.get_my_stop_chemicals(uuid, text);
CREATE FUNCTION public.get_my_stop_chemicals(p_stop_id uuid, p_body_type text DEFAULT 'pool')
RETURNS TABLE (
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  salt numeric,
  products jsonb,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.salt, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id
    AND sc.body_type = p_body_type
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals(uuid, text) TO authenticated;

-- Only a new defaulted parameter added at the end — CREATE OR REPLACE is fine
-- since return type (void) doesn't change and Supabase calls RPCs with named
-- arguments, so parameter order/position doesn't matter to existing callers.
CREATE OR REPLACE FUNCTION public.save_my_stop_chemicals(
  p_stop_id uuid,
  p_free_chlorine numeric,
  p_ph numeric,
  p_total_alkalinity numeric,
  p_calcium_hardness numeric,
  p_stabilizer numeric,
  p_products jsonb,
  p_notes text,
  p_body_type text DEFAULT 'pool',
  p_salt numeric DEFAULT NULL
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

  INSERT INTO public.stop_chemicals (route_stop_id, body_type, free_chlorine, ph, total_alkalinity, calcium_hardness, stabilizer, salt, products, notes)
  VALUES (p_stop_id, p_body_type, p_free_chlorine, p_ph, p_total_alkalinity, p_calcium_hardness, p_stabilizer, p_salt, COALESCE(p_products, '[]'::jsonb), p_notes)
  ON CONFLICT (route_stop_id, body_type) DO UPDATE SET
    free_chlorine = excluded.free_chlorine,
    ph = excluded.ph,
    total_alkalinity = excluded.total_alkalinity,
    calcium_hardness = excluded.calcium_hardness,
    stabilizer = excluded.stabilizer,
    salt = excluded.salt,
    products = excluded.products,
    notes = excluded.notes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_stop_chemicals(uuid, numeric, numeric, numeric, numeric, numeric, jsonb, text, text, numeric) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_stop_chemicals_history(uuid);
CREATE FUNCTION public.get_my_stop_chemicals_history(p_stop_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  body_type text,
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  salt numeric,
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
  SELECT sc.route_stop_id, r.route_date, sc.body_type, sc.free_chlorine, sc.ph, sc.total_alkalinity,
         sc.calcium_hardness, sc.stabilizer, sc.salt, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  WHERE rs.client_id = v_client_id
  ORDER BY r.route_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals_history(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_client_chemicals_history(uuid);
CREATE FUNCTION public.get_my_client_chemicals_history(p_client_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  body_type text,
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  salt numeric,
  products jsonb,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.route_stop_id, r.route_date, sc.body_type, sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.salt, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.clients c ON c.id = rs.client_id
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY r.route_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_chemicals_history(uuid) TO authenticated;
