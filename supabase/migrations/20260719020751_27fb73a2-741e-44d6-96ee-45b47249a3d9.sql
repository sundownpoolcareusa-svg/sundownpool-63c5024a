
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL;

DELETE FROM public.route_stops
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY route_id, client_id ORDER BY created_at ASC, id ASC) AS rn
    FROM public.route_stops
  ) ranked
  WHERE rn > 1
);

DO $$ BEGIN
  ALTER TABLE public.route_stops
    ADD CONSTRAINT route_stops_route_client_unique UNIQUE (route_id, client_id);
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'Cliente';

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS technicians_auth_user_id_key
  ON public.technicians(auth_user_id) WHERE auth_user_id IS NOT NULL;

DROP POLICY IF EXISTS "technician can read own record" ON public.technicians;
CREATE POLICY "technician can read own record" ON public.technicians
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stop_chemicals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_stop_id UUID NOT NULL UNIQUE REFERENCES public.route_stops(id) ON DELETE CASCADE,
  free_chlorine NUMERIC,
  ph NUMERIC,
  total_alkalinity NUMERIC,
  calcium_hardness NUMERIC,
  stabilizer NUMERIC,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stop_chemicals TO authenticated;
GRANT ALL ON public.stop_chemicals TO service_role;

ALTER TABLE public.stop_chemicals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages chemicals via their route_stops" ON public.stop_chemicals;
CREATE POLICY "owner manages chemicals via their route_stops" ON public.stop_chemicals
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.route_stops rs JOIN public.routes r ON r.id = rs.route_id WHERE rs.id = stop_chemicals.route_stop_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.route_stops rs JOIN public.routes r ON r.id = rs.route_id WHERE rs.id = stop_chemicals.route_stop_id AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "technician manages chemicals for own stops" ON public.stop_chemicals;
CREATE POLICY "technician manages chemicals for own stops" ON public.stop_chemicals
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.route_stops rs JOIN public.routes r ON r.id = rs.route_id JOIN public.technicians t ON t.id = r.technician_id WHERE rs.id = stop_chemicals.route_stop_id AND t.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.route_stops rs JOIN public.routes r ON r.id = rs.route_id JOIN public.technicians t ON t.id = r.technician_id WHERE rs.id = stop_chemicals.route_stop_id AND t.auth_user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_stop_chemicals_updated_at ON public.stop_chemicals;
CREATE TRIGGER update_stop_chemicals_updated_at
  BEFORE UPDATE ON public.stop_chemicals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_my_technician_stops(p_date date)
RETURNS TABLE (
  stop_id uuid, route_id uuid, "position" int, scheduled_time time, status text,
  started_at timestamptz, completed_at timestamptz, stop_notes text,
  client_id uuid, client_name text, client_phone text, client_address text,
  client_city text, client_state text, client_zip text,
  client_lat double precision, client_lng double precision, has_chemicals boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT rs.id, rs.route_id, rs.position, rs.scheduled_time, rs.status, rs.started_at, rs.completed_at, rs.notes,
    c.id, c.name, c.phone, c.address, c.city, c.state, c.zip, c.lat, c.lng,
    EXISTS (SELECT 1 FROM public.stop_chemicals sc WHERE sc.route_stop_id = rs.id)
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE t.auth_user_id = auth.uid() AND r.route_date = p_date
  ORDER BY rs.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_stops(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_stop_status(p_stop_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('Pendente', 'Em serviço', 'Concluído') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  UPDATE public.route_stops rs
  SET status = p_status,
      started_at = CASE WHEN p_status = 'Em serviço' AND rs.started_at IS NULL THEN now() ELSE rs.started_at END,
      completed_at = CASE WHEN p_status = 'Concluído' THEN now() ELSE rs.completed_at END
  FROM public.routes r
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.route_id = r.id AND rs.id = p_stop_id AND t.auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;
  IF p_status = 'Concluído' THEN
    UPDATE public.clients c
    SET last_service_date = current_date
    FROM public.route_stops rs
    WHERE rs.id = p_stop_id AND c.id = rs.client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_stop_status(uuid, text) TO authenticated;
