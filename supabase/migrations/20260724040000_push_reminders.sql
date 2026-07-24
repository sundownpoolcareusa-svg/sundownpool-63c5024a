-- Web Push subscriptions, one per device the technician has enabled
-- reminders on. Actual sending happens from the send-service-reminders
-- Edge Function (runs on a cron schedule, uses the service role key so it
-- reads across all technicians — RLS below only matters for direct access,
-- e.g. by the owner).

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (technician_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subscriptions" ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Marks when a reminder was actually sent, so the cron job never double-fires.
ALTER TABLE public.service_jobs
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.save_my_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tech_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id, user_id INTO v_tech_id, v_user_id FROM public.technicians WHERE auth_user_id = auth.uid();
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'Not a technician';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, technician_id, endpoint, p256dh, auth)
  VALUES (v_user_id, v_tech_id, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (technician_id, endpoint) DO UPDATE SET
    p256dh = excluded.p256dh,
    auth = excluded.auth;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_push_subscription(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tech_id uuid;
BEGIN
  SELECT id INTO v_tech_id FROM public.technicians WHERE auth_user_id = auth.uid();
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'Not a technician';
  END IF;

  DELETE FROM public.push_subscriptions WHERE technician_id = v_tech_id AND endpoint = p_endpoint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_push_subscription(text) TO authenticated;
