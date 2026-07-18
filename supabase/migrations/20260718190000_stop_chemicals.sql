-- Pool chemical readings + products logged per route stop
CREATE TABLE public.stop_chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_stop_id UUID NOT NULL UNIQUE REFERENCES public.route_stops(id) ON DELETE CASCADE,
  free_chlorine NUMERIC(5,1),
  ph NUMERIC(5,1),
  total_alkalinity NUMERIC(6,0),
  calcium_hardness NUMERIC(6,0),
  stabilizer NUMERIC(6,0),
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stop_chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own stop chemicals" ON public.stop_chemicals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.id = route_stop_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.id = route_stop_id AND r.user_id = auth.uid()
  ));

CREATE TRIGGER trg_stop_chemicals_updated BEFORE UPDATE ON public.stop_chemicals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
