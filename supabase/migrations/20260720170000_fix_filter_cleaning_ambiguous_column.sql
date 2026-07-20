-- Fixes "column reference filter_cleaning_count is ambiguous": RETURNS
-- TABLE output columns become implicitly-declared PL/pgSQL variables, which
-- collided with the same-named columns.clients column inside the UPDATE's
-- unqualified "filter_cleaning_count + 1" expression. Qualifying the table
-- alias on the right-hand side resolves it.
CREATE OR REPLACE FUNCTION public.log_my_stop_filter_cleaning(p_stop_id uuid)
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

  UPDATE public.clients c
  SET filter_last_cleaned_at = now(),
      filter_cleaning_count = c.filter_cleaning_count + 1
  WHERE c.id = v_client_id;

  RETURN QUERY
  SELECT c.filter_last_cleaned_at, c.filter_cleaning_count
  FROM public.clients c
  WHERE c.id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_my_stop_filter_cleaning(uuid) TO authenticated;
