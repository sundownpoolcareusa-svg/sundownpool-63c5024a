-- Client Detail sheet for the technician app: history, invoices (read-only),
-- and photo/equipment updates for any client assigned to the signed-in
-- technician (not just clients on today's route). All SECURITY DEFINER since
-- technicians have no direct RLS access to clients/stop_chemicals/invoices.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS equipment_notes TEXT;

-- Extend get_my_technician_clients with photo/equipment fields the detail
-- sheet needs. Postgres can't change a function's return columns via
-- CREATE OR REPLACE, so drop and recreate.
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
  equipment_notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.city, c.state, c.zip,
    c.client_type, c.status, c.service_days, c.monthly_value,
    c.pool_photos, c.equipment_photos, c.equipment_notes
  FROM public.clients c
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE t.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_clients() TO authenticated;

-- Every chemicals/products entry logged for one client, across all of their
-- stops — authorized via the client's own technician_id (not a specific
-- stop), so it works even for clients with no visit scheduled today.
CREATE OR REPLACE FUNCTION public.get_my_client_chemicals_history(p_client_id uuid)
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.route_stop_id, r.route_date, sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.clients c ON c.id = rs.client_id
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY r.route_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_chemicals_history(uuid) TO authenticated;

-- Read-only invoice list for a client — technician can see billing status
-- but has no way to create/edit invoices.
CREATE OR REPLACE FUNCTION public.get_my_client_invoices(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  number text,
  invoice_date date,
  due_date date,
  status text,
  total numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT i.id, i.number, i.invoice_date, i.due_date, i.status, i.total
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY i.invoice_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_invoices(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_client_pool_photos(p_client_id uuid, p_photos text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients c
  SET pool_photos = p_photos
  FROM public.technicians t
  WHERE c.id = p_client_id AND c.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_client_pool_photos(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_client_equipment(p_client_id uuid, p_photos text[], p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients c
  SET equipment_photos = p_photos, equipment_notes = p_notes
  FROM public.technicians t
  WHERE c.id = p_client_id AND c.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_client_equipment(uuid, text[], text) TO authenticated;
