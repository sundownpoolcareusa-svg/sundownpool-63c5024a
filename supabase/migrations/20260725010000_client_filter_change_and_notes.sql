-- Filter REPLACEMENT (media/cartridge change) is a once-a-year maintenance
-- task, distinct from the routine filter cleaning already tracked via
-- filter_last_cleaned_at (which technicians log every visit, ~3-week
-- cadence). Track it separately so the "Trocar filtro" alert on the
-- technician's client detail page can fire on an annual cycle.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS filter_last_changed_at DATE;

-- Expose the client's general notes field (already used by the owner's
-- dashboard) and the new filter-change date to the technician's client list.
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
  notes text,
  filter_last_changed_at date,
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
    c.pool_photos, c.equipment_photos, c.equipment_notes, c.notes,
    c.filter_last_changed_at, c.has_spa, c.has_salt_system
  FROM public.clients c
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE t.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_client_notes(p_client_id uuid, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients c
  SET notes = p_notes
  FROM public.technicians t
  WHERE c.id = p_client_id AND c.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_client_notes(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_my_client_filter_change(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients c
  SET filter_last_changed_at = CURRENT_DATE
  FROM public.technicians t
  WHERE c.id = p_client_id AND c.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_my_client_filter_change(uuid) TO authenticated;
