
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS estimates_public_token_idx ON public.estimates(public_token);
