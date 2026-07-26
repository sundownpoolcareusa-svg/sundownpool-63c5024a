-- More granular per-category permissions, alongside the two already in use
-- (can_view_earnings, can_manage_clients). None of these are enforced by
-- any page yet — Users can only sign into /tecnico today, which has no
-- Routes/Estimates/Invoices/Services screens of its own — but the owner
-- wants to set them now, ahead of a future admin-lite role that can see
-- parts of the main dashboard.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_routes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_estimates BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_invoices BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_services BOOLEAN NOT NULL DEFAULT false;

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
  SELECT t.id, t.name, t.phone, t.color, t.active, t.auth_user_id, u.email,
         t.home_address, t.home_lat, t.home_lng, t.photo_path, t.is_owner,
         t.can_view_earnings, t.can_manage_clients, t.can_manage_users,
         t.can_manage_routes, t.can_manage_estimates, t.can_manage_invoices, t.can_manage_services,
         t.created_at
  FROM public.technicians t
  LEFT JOIN auth.users u ON u.id = t.auth_user_id
  WHERE t.user_id = auth.uid() AND t.active = true
  ORDER BY t.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technicians_admin() TO authenticated;
