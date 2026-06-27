
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_token_idx ON public.invoices(public_token);

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
