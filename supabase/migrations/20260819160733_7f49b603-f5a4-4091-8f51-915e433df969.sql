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