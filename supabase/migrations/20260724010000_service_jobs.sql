-- Ad-hoc service jobs a technician opens for a client (e.g. "Troca de
-- filtro", "Tratamento de fosfato") — distinct from the daily recurring
-- route_stops, since a job can span more than one visit before it's done.
-- Powers the technician app's "Serviços" tab.

CREATE TABLE public.service_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Em serviço',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own service jobs" ON public.service_jobs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_service_jobs_updated BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_jobs_tech_status ON public.service_jobs(technician_id, status, created_at);

-- Technician RPCs (SECURITY DEFINER — technicians have no direct table
-- access to service_jobs, same pattern as routes/route_stops).

CREATE FUNCTION public.get_my_service_jobs(p_status text DEFAULT NULL)
RETURNS TABLE (
  job_id uuid,
  client_id uuid,
  client_name text,
  title text,
  notes text,
  status text,
  created_at timestamptz,
  completed_at timestamptz,
  next_visit_date date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH me AS (
    SELECT id AS tech_id FROM public.technicians WHERE auth_user_id = auth.uid()
  ),
  next_visit AS (
    SELECT DISTINCT ON (rs.client_id) rs.client_id, r.route_date
    FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE r.route_date >= CURRENT_DATE AND rs.status <> 'Concluído'
    ORDER BY rs.client_id, r.route_date ASC
  )
  SELECT sj.id, sj.client_id, c.name, sj.title, sj.notes, sj.status, sj.created_at, sj.completed_at, nv.route_date
  FROM public.service_jobs sj
  JOIN me ON sj.technician_id = me.tech_id
  JOIN public.clients c ON c.id = sj.client_id
  LEFT JOIN next_visit nv ON nv.client_id = sj.client_id
  WHERE p_status IS NULL OR sj.status = p_status
  ORDER BY sj.status = 'Concluído', sj.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_service_jobs(text) TO authenticated;

CREATE FUNCTION public.create_my_service_job(p_client_id uuid, p_title text, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tech_id uuid;
  v_user_id uuid;
  v_owns boolean;
  v_job_id uuid;
BEGIN
  SELECT id, user_id INTO v_tech_id, v_user_id FROM public.technicians WHERE auth_user_id = auth.uid();
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'Not a technician';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND technician_id = v_tech_id
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;

  INSERT INTO public.service_jobs (user_id, technician_id, client_id, title, notes)
  VALUES (v_user_id, v_tech_id, p_client_id, p_title, p_notes)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_my_service_job(uuid, text, text) TO authenticated;

CREATE FUNCTION public.complete_my_service_job(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.service_jobs sj
    JOIN public.technicians t ON t.id = sj.technician_id
    WHERE sj.id = p_job_id AND t.auth_user_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Service job not found or not assigned to you';
  END IF;

  UPDATE public.service_jobs
  SET status = 'Concluído', completed_at = now()
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_my_service_job(uuid) TO authenticated;
