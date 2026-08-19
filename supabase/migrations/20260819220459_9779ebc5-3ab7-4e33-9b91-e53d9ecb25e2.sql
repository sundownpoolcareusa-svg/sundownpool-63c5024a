-- Remove public (anonymous) EXECUTE from non-public SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_stop_visit_photos(uuid, text[]) FROM PUBLIC;

-- Ensure authenticated users can still call save_stop_visit_photos
GRANT EXECUTE ON FUNCTION public.save_stop_visit_photos(uuid, text[]) TO authenticated;

-- Fix search_path on trigger function (linter warning)
ALTER FUNCTION public.set_notify_since_timestamps() SET search_path = public;

-- Optional: remove direct public EXECUTE from trigger helpers
REVOKE EXECUTE ON FUNCTION public.set_notify_since_timestamps() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;