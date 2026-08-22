-- Per-account business info (company name/address/phone) shown on invoices,
-- estimates, and their emails — needed now that a second, unrelated
-- business (a separate owner account) uses this app and must not show
-- "Effect Up LLC" on their own documents. Every existing invoice/estimate
-- route falls back to the old hardcoded Sundown Pool Care values when a
-- profile row doesn't exist, so nothing changes for the current owner
-- until they (or anyone else) fills one in.
CREATE TABLE public.business_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own business profile" ON public.business_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Technicians with invoice access already see the full invoice/estimate
-- detail view (including this header) on their employer's behalf.
CREATE POLICY "technician reads employer business profile" ON public.business_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.auth_user_id = auth.uid() AND t.user_id = business_profiles.user_id AND t.active = true
    )
  );

-- Public invoice/estimate links need the issuing owner's business info too,
-- same token-gated SECURITY DEFINER pattern as the rest of these functions.
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
