-- The "photo from your visit" email was using route_stops.completed_at for
-- its date/time — wrong whenever a photo gets added/replaced after the
-- stop was already marked Concluído (e.g. going back into the Chemicals
-- screen later), since completed_at only reflects when the status last
-- flipped to Concluído, not when the photo was actually taken. Track the
-- photo's own timestamp instead, set at the moment it's saved.
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS photo_taken_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.save_my_stop_visit_photos(p_stop_id uuid, p_photos text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.route_stops rs
  SET visit_photos = p_photos,
      photo_taken_at = CASE WHEN COALESCE(array_length(p_photos, 1), 0) > 0 THEN now() ELSE NULL END
  FROM public.routes r, public.technicians t
  WHERE rs.id = p_stop_id AND rs.route_id = r.id AND r.technician_id = t.id AND t.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_stop_visit_photos(uuid, text[]) TO authenticated;
