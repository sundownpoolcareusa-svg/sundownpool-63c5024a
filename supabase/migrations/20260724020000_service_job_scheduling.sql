-- The "Novo serviço" flow is becoming a 4-step wizard (Cliente > Serviço >
-- Data e hora > Revisão): multiple service-type checkboxes, a priority
-- level, and an optional scheduled date/time/duration/reminder preference
-- for the job. These columns just store that data — there is no push
-- notification system yet, so reminder_enabled/reminder_minutes_before are
-- saved as a preference only and don't trigger an actual notification.

ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS service_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before INT;

-- Return columns change, so CREATE OR REPLACE can't be used for this one.
DROP FUNCTION IF EXISTS public.get_my_service_jobs(text);
CREATE FUNCTION public.get_my_service_jobs(p_status text DEFAULT NULL)
RETURNS TABLE (
  job_id uuid,
  client_id uuid,
  client_name text,
  title text,
  notes text,
  status text,
  service_types text[],
  priority text,
  scheduled_date date,
  scheduled_time time,
  duration_minutes int,
  reminder_enabled boolean,
  reminder_minutes_before int,
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
  SELECT
    sj.id, sj.client_id, c.name, sj.title, sj.notes, sj.status,
    sj.service_types, sj.priority, sj.scheduled_date, sj.scheduled_time, sj.duration_minutes,
    sj.reminder_enabled, sj.reminder_minutes_before,
    sj.created_at, sj.completed_at, nv.route_date
  FROM public.service_jobs sj
  JOIN me ON sj.technician_id = me.tech_id
  JOIN public.clients c ON c.id = sj.client_id
  LEFT JOIN next_visit nv ON nv.client_id = sj.client_id
  WHERE p_status IS NULL OR sj.status = p_status
  ORDER BY sj.status = 'Concluído', sj.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_service_jobs(text) TO authenticated;

-- Only new defaulted parameters added — CREATE OR REPLACE is fine since the
-- return type (uuid) doesn't change and Supabase calls RPCs with named
-- arguments, so parameter order/position doesn't matter to existing callers.
CREATE OR REPLACE FUNCTION public.create_my_service_job(
  p_client_id uuid,
  p_title text,
  p_notes text DEFAULT NULL,
  p_service_types text[] DEFAULT '{}',
  p_priority text DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_scheduled_time time DEFAULT NULL,
  p_duration_minutes int DEFAULT NULL,
  p_reminder_enabled boolean DEFAULT false,
  p_reminder_minutes_before int DEFAULT NULL
)
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

  INSERT INTO public.service_jobs (
    user_id, technician_id, client_id, title, notes,
    service_types, priority, scheduled_date, scheduled_time, duration_minutes,
    reminder_enabled, reminder_minutes_before
  )
  VALUES (
    v_user_id, v_tech_id, p_client_id, p_title, p_notes,
    COALESCE(p_service_types, '{}'), p_priority, p_scheduled_date, p_scheduled_time, p_duration_minutes,
    COALESCE(p_reminder_enabled, false), p_reminder_minutes_before
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_my_service_job(
  uuid, text, text, text[], text, date, time, int, boolean, int
) TO authenticated;
