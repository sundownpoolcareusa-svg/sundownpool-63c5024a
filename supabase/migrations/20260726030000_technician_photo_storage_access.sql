-- The storage lockdown in 20260726022905 only recognized "<uid>/...",
-- "client-<id>/...", and "stop-<id>/..." paths in the client-photos bucket.
-- Technician avatar photos are uploaded under "technicians/<technicianId>/...",
-- which matched none of those cases, so every technician avatar started
-- silently failing to load (falling back to initials) as soon as that
-- migration ran. Add the missing case.
CREATE OR REPLACE FUNCTION public.can_access_client_photo(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_first text;
  v_id_text text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR p_name IS NULL THEN RETURN false; END IF;
  v_first := split_part(p_name, '/', 1);
  IF v_first = '' THEN RETURN false; END IF;

  -- Legacy path: "<auth.uid()>/..."
  BEGIN
    IF v_first::uuid = v_uid THEN RETURN true; END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- "client-<clientId>/..."
  IF v_first LIKE 'client-%' THEN
    v_id_text := substring(v_first from 8);
    BEGIN
      v_id := v_id_text::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.clients c
      LEFT JOIN public.technicians t ON t.id = c.technician_id
      WHERE c.id = v_id
        AND (c.user_id = v_uid OR t.auth_user_id = v_uid OR t.user_id = v_uid)
    );
  END IF;

  -- "stop-<stopId>/..."
  IF v_first LIKE 'stop-%' THEN
    v_id_text := substring(v_first from 6);
    BEGIN
      v_id := v_id_text::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      LEFT JOIN public.technicians t ON t.id = r.technician_id
      WHERE rs.id = v_id
        AND (r.user_id = v_uid OR t.auth_user_id = v_uid OR t.user_id = v_uid)
    );
  END IF;

  -- "technicians/<technicianId>/..." — avatar photos, uploaded by the
  -- owner or by the technician themselves once they have their own login.
  IF v_first = 'technicians' THEN
    v_id_text := split_part(p_name, '/', 2);
    BEGIN
      v_id := v_id_text::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.id = v_id
        AND (t.user_id = v_uid OR t.auth_user_id = v_uid)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_client_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_client_photo(text) TO authenticated, service_role;

-- The Master doesn't get a separate /tecnico login (see the "is_owner"
-- guard in manage-technician-login), so their row's auth_email was always
-- null — the Users page showed no email at all for them. Show their own
-- admin account's email instead for that one row.
CREATE OR REPLACE FUNCTION public.get_my_technicians_admin()
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  color text,
  active boolean,
  auth_user_id uuid,
  auth_email text,
  home_address text,
  home_lat double precision,
  home_lng double precision,
  photo_path text,
  is_owner boolean,
  can_view_earnings boolean,
  can_manage_clients boolean,
  can_manage_users boolean,
  can_manage_routes boolean,
  can_manage_estimates boolean,
  can_manage_invoices boolean,
  can_manage_services boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT t.id, t.name, t.phone, t.color, t.active, t.auth_user_id,
         COALESCE(tech_u.email, owner_u.email) AS auth_email,
         t.home_address, t.home_lat, t.home_lng, t.photo_path, t.is_owner,
         t.can_view_earnings, t.can_manage_clients, t.can_manage_users,
         t.can_manage_routes, t.can_manage_estimates, t.can_manage_invoices, t.can_manage_services,
         t.created_at
  FROM public.technicians t
  LEFT JOIN auth.users tech_u ON tech_u.id = t.auth_user_id
  LEFT JOIN auth.users owner_u ON t.is_owner AND owner_u.id = t.user_id
  WHERE t.user_id = auth.uid() AND t.active = true
  ORDER BY t.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technicians_admin() TO authenticated;
