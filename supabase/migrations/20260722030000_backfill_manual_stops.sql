-- The `manual` column (added in the previous migration) defaults new rows
-- correctly, but existing rows were backfilled to `false` by the ALTER TABLE
-- itself — including one-time visits created before that column existed.
-- Those were then wide open to removeStaleClientStops deleting them again
-- the next time the client was saved. A route_stops.notes value has only
-- ever been set by a one-time visit (recurring auto-add never sets notes),
-- so it's a reliable signal to reclassify those rows as manual.
UPDATE public.route_stops
SET manual = true
WHERE notes IS NOT NULL AND manual = false;
