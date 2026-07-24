-- The Salt Pool chemistry reading should only show up for clients whose
-- pool actually has a salt chlorination system — not every client. Add a
-- flag the owner sets on the client record, following the same pattern as
-- the existing has_spa toggle.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_salt_system BOOLEAN NOT NULL DEFAULT false;

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
  has_salt_system boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type,
         c.filter_last_cleaned_at, c.filter_cleaning_count, c.has_spa, c.has_salt_system
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_technician_clients();
CREATE FUNCTION public.get_my_technician_clients()
RETURNS TABLE (
  client_id uuid,
  name text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  client_type text,
  status text,
  service_days text[],
  monthly_value numeric,
  pool_photos text[],
  equipment_photos text[],
  equipment_notes text,
  has_spa boolean,
  has_salt_system boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.city, c.state, c.zip,
    c.client_type, c.status, c.service_days, c.monthly_value,
    c.pool_photos, c.equipment_photos, c.equipment_notes, c.has_spa, c.has_salt_system
  FROM public.clients c
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE t.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_clients() TO authenticated;
