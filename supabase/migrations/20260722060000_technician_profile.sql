-- Lets a technician record their home address so route optimization can
-- anchor the day there — deciding whether it's shorter to start near home
-- and finish at the farthest pool, or start far and finish close to home,
-- instead of ignoring where the route actually begins and ends.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION;

-- A technician could already SELECT their own row (technician_login_access
-- migration) but had no way to update it. A narrow SECURITY DEFINER RPC
-- (rather than a blanket UPDATE RLS policy) so they can only touch their own
-- phone/home fields — not color, active, user_id, or auth_user_id.
CREATE OR REPLACE FUNCTION public.update_my_technician_profile(
  p_phone TEXT,
  p_home_address TEXT,
  p_home_lat DOUBLE PRECISION,
  p_home_lng DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.technicians
  SET phone = p_phone,
      home_address = p_home_address,
      home_lat = p_home_lat,
      home_lng = p_home_lng
  WHERE auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Technician record not found for this login';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_technician_profile(text, text, double precision, double precision) TO authenticated;
