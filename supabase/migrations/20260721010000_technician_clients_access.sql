-- Lets a technician see the list of clients assigned to them (all clients
-- with technician_id = their own technicians row), not just today's route
-- stops — used by the "Clientes" tab on the technician app.
CREATE OR REPLACE FUNCTION public.get_my_technician_clients()
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
  monthly_value numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.city, c.state, c.zip,
    c.client_type, c.status, c.service_days, c.monthly_value
  FROM public.clients c
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE t.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_clients() TO authenticated;
