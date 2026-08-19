REVOKE ALL ON FUNCTION public.get_my_stop_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_stop_visit_photos(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_stop_visit_photos(uuid, text[]) TO authenticated;