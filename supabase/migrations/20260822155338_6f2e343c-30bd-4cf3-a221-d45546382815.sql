CREATE TABLE IF NOT EXISTS public.business_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own business profile" ON public.business_profiles;

CREATE POLICY "owner manages own business profile" ON public.business_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "technician reads employer business profile" ON public.business_profiles;

CREATE POLICY "technician reads employer business profile" ON public.business_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.auth_user_id = auth.uid() AND t.user_id = business_profiles.user_id AND t.active = true
    )
  );

CREATE OR REPLACE FUNCTION public.get_invoice_public(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'invoice', to_jsonb(i.*) - 'user_id',
    'client', jsonb_build_object(
      'name', c.name, 'email', c.email, 'phone', c.phone,
      'address', c.address, 'city', c.city, 'state', c.state, 'zip', c.zip
    ),
    'business', (
      SELECT jsonb_build_object(
        'company_name', bp.company_name, 'address', bp.address, 'city', bp.city,
        'state', bp.state, 'zip', bp.zip, 'phone', bp.phone
      )
      FROM public.business_profiles bp WHERE bp.user_id = i.user_id
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(it.*) ORDER BY it.position)
      FROM public.invoice_items it WHERE it.invoice_id = i.id
    ), '[]'::jsonb)
  )
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  WHERE i.public_token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_public(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_estimate_public(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'estimate', to_jsonb(e.*) - 'user_id',
    'client', jsonb_build_object(
      'name', c.name, 'email', c.email, 'phone', c.phone,
      'address', c.address, 'city', c.city, 'state', c.state, 'zip', c.zip
    ),
    'business', (
      SELECT jsonb_build_object(
        'company_name', bp.company_name, 'address', bp.address, 'city', bp.city,
        'state', bp.state, 'zip', bp.zip, 'phone', bp.phone
      )
      FROM public.business_profiles bp WHERE bp.user_id = e.user_id
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(it.*) ORDER BY it.position)
      FROM public.estimate_items it WHERE it.estimate_id = e.id
    ), '[]'::jsonb)
  )
  FROM public.estimates e
  JOIN public.clients c ON c.id = e.client_id
  WHERE e.public_token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_estimate_public(uuid) TO anon, authenticated;