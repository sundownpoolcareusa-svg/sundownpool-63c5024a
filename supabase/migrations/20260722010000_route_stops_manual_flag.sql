-- Distinguishes a deliberately-added stop (a one-time visit, or manually
-- added from the Rotas page) from one auto-created for a client's recurring
-- service_days. Without this, removeStaleClientStops (which cleans up stops
-- that no longer match a client's current recurring days) couldn't tell the
-- two apart and was deleting one-time visits it never should have touched.
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
