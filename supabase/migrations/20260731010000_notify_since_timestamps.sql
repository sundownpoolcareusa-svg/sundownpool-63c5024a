-- Turning on a client's email opt-in (on-the-way/chemicals/photo) shouldn't
-- retroactively email them about visits that already happened before the
-- toggle was flipped on — send-client-emails only checked "opted in AND not
-- yet sent", so an old already-completed stop with no email sent yet would
-- fire the moment the client opted in, days or weeks after that visit.
-- These *_since columns record the moment each flag was last turned on, so
-- the edge function can additionally require the stop's own date to be on
-- or after that moment. Left NULL for existing already-true flags (handled
-- as "no cutoff" in the function) so this doesn't suppress anything already
-- working today — it only takes effect the next time a flag gets toggled.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_on_way_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notify_chemicals_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notify_photo_since TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_notify_since_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.notify_on_way AND (TG_OP = 'INSERT' OR NOT OLD.notify_on_way) THEN
    NEW.notify_on_way_since := now();
  END IF;
  IF NEW.notify_chemicals AND (TG_OP = 'INSERT' OR NOT OLD.notify_chemicals) THEN
    NEW.notify_chemicals_since := now();
  END IF;
  IF NEW.notify_photo AND (TG_OP = 'INSERT' OR NOT OLD.notify_photo) THEN
    NEW.notify_photo_since := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_notify_since ON public.clients;
CREATE TRIGGER trg_set_notify_since
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_notify_since_timestamps();
