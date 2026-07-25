-- Per-technician permissions. Starting with two — more can be added later
-- the same way. can_view_earnings gates the $ figures already shown on the
-- technician's own dashboard (Total mensal / Média por piscina / Média por
-- visita / Custo médio); can_manage_clients is stored for a future feature
-- (adding/editing clients from the technician app doesn't exist yet) so the
-- owner can pre-set it without waiting on that build.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS can_view_earnings BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_clients BOOLEAN NOT NULL DEFAULT false;

-- Lets the owner see which email (if any) is linked to each technician's own
-- login, alongside everything already visible in the Users admin page.
-- auth.users isn't reachable through the normal API, so this has to be a
-- SECURITY DEFINER function that joins it server-side.
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
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT t.id, t.name, t.phone, t.color, t.active, t.auth_user_id, u.email,
         t.home_address, t.home_lat, t.home_lng, t.photo_path, t.is_owner,
         t.can_view_earnings, t.can_manage_clients, t.created_at
  FROM public.technicians t
  LEFT JOIN auth.users u ON u.id = t.auth_user_id
  WHERE t.user_id = auth.uid() AND t.active = true
  ORDER BY t.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technicians_admin() TO authenticated;
