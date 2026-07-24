-- Split the single "notify by email" toggle into three independent choices
-- per client: on-the-way, chemical readings, and visit photo — the owner
-- picks which of the three a given client actually receives, instead of
-- all-or-nothing.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_on_way BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_chemicals BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_photo BOOLEAN NOT NULL DEFAULT false;

-- Carry forward anyone already opted in under the old single toggle so they
-- don't silently stop receiving anything.
UPDATE public.clients
SET notify_on_way = true, notify_chemicals = true, notify_photo = true
WHERE notify_by_email = true;

ALTER TABLE public.clients DROP COLUMN IF EXISTS notify_by_email;

-- Chemicals and photo are now sent as two separate emails (previously one
-- combined "completion" email), each with its own sent-once flag.
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS photo_email_sent_at TIMESTAMPTZ;

ALTER TABLE public.route_stops RENAME COLUMN completion_email_sent_at TO chemicals_email_sent_at;
