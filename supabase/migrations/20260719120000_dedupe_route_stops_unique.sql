-- A client could end up added to the same route twice (e.g. a client-side
-- race between the auto-recurring-schedule effect and a manual add). Clean
-- up any existing duplicates, keeping the earliest stop per (route, client)
-- pair, then enforce this at the database level so it can never happen again.

DELETE FROM public.route_stops
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY route_id, client_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
    FROM public.route_stops
  ) ranked
  WHERE rn > 1
);

ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_route_client_unique UNIQUE (route_id, client_id);
