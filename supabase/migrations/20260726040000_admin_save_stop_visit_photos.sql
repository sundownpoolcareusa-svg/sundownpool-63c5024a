-- The admin-side photo save (src/lib/db.ts's saveStopVisitPhotos) went
-- through a plain REST update (supabase.from("route_stops").update(...)),
-- which depends on PostgREST's schema cache already knowing about the
-- photo_taken_at column. That cache can lag behind a manual ALTER TABLE
-- run through the SQL editor (as happened here), causing "Could not find
-- the 'photo_taken_at' column ... in the schema cache" even though the
-- column exists. RPCs run as plain SQL inside Postgres and never touch
-- that cache — the technician's own save_my_stop_visit_photos already
-- uses one, which is why only the admin path hit this. Give the admin
-- path the same kind of function instead of relying on a cache reload.
CREATE OR REPLACE FUNCTION public.save_stop_visit_photos(p_stop_id uuid, p_photos text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.route_stops rs
  SET visit_photos = p_photos,
      photo_taken_at = CASE WHEN COALESCE(array_length(p_photos, 1), 0) > 0 THEN now() ELSE NULL END
  FROM public.routes r
  WHERE rs.route_id = r.id
    AND rs.id = p_stop_id
    AND r.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found or not yours';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_stop_visit_photos(uuid, text[]) TO authenticated;
