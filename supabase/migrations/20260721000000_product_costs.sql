-- Per-product cost per unit, set by the owner, used to compute the cost of
-- chemicals used on each visit (qty logged on a stop x cost per unit).
CREATE TABLE public.product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_name)
);

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own product costs" ON public.product_costs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_product_costs_updated BEFORE UPDATE ON public.product_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
