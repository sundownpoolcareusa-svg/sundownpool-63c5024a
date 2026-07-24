-- CREATE OR REPLACE FUNCTION only truly replaces a function when its
-- parameter type list matches exactly. Two earlier migrations added new
-- parameters via CREATE OR REPLACE without first dropping the old
-- signature, which — since the parameter list changed — created a second
-- overload in Postgres instead of replacing the original. Both stale
-- overloads are now unreachable (every caller passes the full new
-- parameter set) but linger in the schema and show up as confusing
-- union types when regenerating TypeScript types. Drop them.

DROP FUNCTION IF EXISTS public.save_my_stop_chemicals(uuid, numeric, numeric, numeric, numeric, numeric, jsonb, text);
DROP FUNCTION IF EXISTS public.save_my_stop_chemicals(uuid, numeric, numeric, numeric, numeric, numeric, jsonb, text, text);

DROP FUNCTION IF EXISTS public.create_my_service_job(uuid, text, text);
