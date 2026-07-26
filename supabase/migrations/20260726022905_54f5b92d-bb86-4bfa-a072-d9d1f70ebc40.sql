
-- 1) Storage: enforce ownership on client-photos bucket
DROP POLICY IF EXISTS "client-photos auth read" ON storage.objects;
DROP POLICY IF EXISTS "client-photos auth insert" ON storage.objects;
DROP POLICY IF EXISTS "client-photos auth update" ON storage.objects;
DROP POLICY IF EXISTS "client-photos auth delete" ON storage.objects;

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
    -- not a uuid, continue
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

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_client_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_client_photo(text) TO authenticated, service_role;

CREATE POLICY "client-photos owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-photos' AND public.can_access_client_photo(name));

CREATE POLICY "client-photos owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-photos' AND public.can_access_client_photo(name));

CREATE POLICY "client-photos owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-photos' AND public.can_access_client_photo(name))
  WITH CHECK (bucket_id = 'client-photos' AND public.can_access_client_photo(name));

CREATE POLICY "client-photos owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-photos' AND public.can_access_client_photo(name));

-- 2) Revoke anon EXECUTE on all public SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Trigger-only function: no direct callers needed
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
