-- The technician's dedicated Chemicals page completes a stop directly
-- ("Save & Complete") without ever going through the stop-list's photo
-- prompt (client_notify_photo / has_visit_photo, already used in
-- tecnico.tsx and rotas.tsx) — it had no way to know the client wants a
-- visit photo. Extend get_my_stop_detail with the same client_notify_photo
-- flag so that page can ask too.
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
  filter_cleaning_count int,
  has_spa boolean,
  has_salt_system boolean,
  visit_photos text[],
  client_notify_photo boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type,
         c.filter_last_cleaned_at, c.filter_cleaning_count, c.has_spa, c.has_salt_system, rs.visit_photos,
         c.notify_photo
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;
