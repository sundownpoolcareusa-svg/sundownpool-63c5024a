-- Lets a technician edit an existing service job (client, service types,
-- notes, priority, scheduling, reminder) instead of only creating/
-- completing one. Resets reminder_sent_at so an edited schedule is
-- eligible for a fresh reminder.

CREATE FUNCTION public.update_my_service_job(
  p_job_id uuid,
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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tech_id uuid;
  v_owns_job boolean;
  v_owns_client boolean;
BEGIN
  SELECT id INTO v_tech_id FROM public.technicians WHERE auth_user_id = auth.uid();
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'Not a technician';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.service_jobs WHERE id = p_job_id AND technician_id = v_tech_id
  ) INTO v_owns_job;
  IF NOT v_owns_job THEN
    RAISE EXCEPTION 'Service job not found or not assigned to you';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND technician_id = v_tech_id
  ) INTO v_owns_client;
  IF NOT v_owns_client THEN
    RAISE EXCEPTION 'Client not found or not assigned to you';
  END IF;

  UPDATE public.service_jobs SET
    client_id = p_client_id,
    title = p_title,
    notes = p_notes,
    service_types = COALESCE(p_service_types, '{}'),
    priority = p_priority,
    scheduled_date = p_scheduled_date,
    scheduled_time = p_scheduled_time,
    duration_minutes = p_duration_minutes,
    reminder_enabled = COALESCE(p_reminder_enabled, false),
    reminder_minutes_before = p_reminder_minutes_before,
    reminder_sent_at = NULL
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_service_job(
  uuid, uuid, text, text, text[], text, date, time, int, boolean, int
) TO authenticated;
