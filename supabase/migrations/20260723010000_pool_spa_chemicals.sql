-- Some clients (e.g. hotels) have a spa that's a physically independent
-- body of water from the pool, needing its own chemical readings and
-- product log. Adds a per-client flag and lets stop_chemicals hold up to
-- one row per body (pool/spa) for a given visit instead of exactly one.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_spa BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.stop_chemicals
  ADD COLUMN IF NOT EXISTS body_type TEXT NOT NULL DEFAULT 'pool' CHECK (body_type IN ('pool', 'spa'));

ALTER TABLE public.stop_chemicals DROP CONSTRAINT IF EXISTS stop_chemicals_route_stop_id_key;
DO $$ BEGIN
  ALTER TABLE public.stop_chemicals
    ADD CONSTRAINT stop_chemicals_route_stop_id_body_type_key UNIQUE (route_stop_id, body_type);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Technician RPCs: read/write/list a specific body instead of assuming
-- exactly one record per stop. Appending p_body_type with a default keeps
-- these backward compatible (existing calls default to 'pool').
CREATE OR REPLACE FUNCTION public.get_my_stop_chemicals(p_stop_id uuid, p_body_type text DEFAULT 'pool')
RETURNS TABLE (
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  products jsonb,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id
    AND sc.body_type = p_body_type
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_my_stop_chemicals(
  p_stop_id uuid,
  p_free_chlorine numeric,
  p_ph numeric,
  p_total_alkalinity numeric,
  p_calcium_hardness numeric,
  p_stabilizer numeric,
  p_products jsonb,
  p_notes text,
  p_body_type text DEFAULT 'pool'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    JOIN public.technicians t ON t.id = r.technician_id
    WHERE rs.id = p_stop_id AND t.auth_user_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  INSERT INTO public.stop_chemicals (route_stop_id, body_type, free_chlorine, ph, total_alkalinity, calcium_hardness, stabilizer, products, notes)
  VALUES (p_stop_id, p_body_type, p_free_chlorine, p_ph, p_total_alkalinity, p_calcium_hardness, p_stabilizer, COALESCE(p_products, '[]'::jsonb), p_notes)
  ON CONFLICT (route_stop_id, body_type) DO UPDATE SET
    free_chlorine = excluded.free_chlorine,
    ph = excluded.ph,
    total_alkalinity = excluded.total_alkalinity,
    calcium_hardness = excluded.calcium_hardness,
    stabilizer = excluded.stabilizer,
    products = excluded.products,
    notes = excluded.notes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_stop_chemicals(uuid, numeric, numeric, numeric, numeric, numeric, jsonb, text, text) TO authenticated;

-- Return columns change on these three, so CREATE OR REPLACE can't be used.
DROP FUNCTION IF EXISTS public.get_my_stop_detail(uuid);
CREATE FUNCTION public.get_my_stop_detail(p_stop_id uuid)
RETURNS TABLE (
  stop_id uuid,
  "position" int,
  status text,
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_type text,
  has_spa boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, rs.position, rs.status, c.name, c.address, c.city, c.state, c.zip, c.client_type, c.has_spa
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  JOIN public.clients c ON c.id = rs.client_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_detail(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_stop_chemicals_history(uuid);
CREATE FUNCTION public.get_my_stop_chemicals_history(p_stop_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  body_type text,
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  products jsonb,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT rs.client_id INTO v_client_id
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.technicians t ON t.id = r.technician_id
  WHERE rs.id = p_stop_id
    AND t.auth_user_id = auth.uid();

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Stop not found or not assigned to you';
  END IF;

  RETURN QUERY
  SELECT sc.route_stop_id, r.route_date, sc.body_type, sc.free_chlorine, sc.ph, sc.total_alkalinity,
         sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  WHERE rs.client_id = v_client_id
  ORDER BY r.route_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stop_chemicals_history(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_client_chemicals_history(uuid);
CREATE FUNCTION public.get_my_client_chemicals_history(p_client_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  body_type text,
  free_chlorine numeric,
  ph numeric,
  total_alkalinity numeric,
  calcium_hardness numeric,
  stabilizer numeric,
  products jsonb,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sc.route_stop_id, r.route_date, sc.body_type, sc.free_chlorine, sc.ph, sc.total_alkalinity, sc.calcium_hardness, sc.stabilizer, sc.products, sc.notes
  FROM public.stop_chemicals sc
  JOIN public.route_stops rs ON rs.id = sc.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.clients c ON c.id = rs.client_id
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY r.route_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_chemicals_history(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_technician_clients();
CREATE FUNCTION public.get_my_technician_clients()
RETURNS TABLE (
  client_id uuid,
  name text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  client_type text,
  status text,
  service_days text[],
  monthly_value numeric,
  pool_photos text[],
  equipment_photos text[],
  equipment_notes text,
  has_spa boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.city, c.state, c.zip,
    c.client_type, c.status, c.service_days, c.monthly_value,
    c.pool_photos, c.equipment_photos, c.equipment_notes, c.has_spa
  FROM public.clients c
  JOIN public.technicians t ON t.id = c.technician_id
  WHERE t.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_clients() TO authenticated;

-- Same return columns, no DROP needed: pin the "representative" chemicals
-- row for this visit-history join to the pool reading, now that a stop can
-- have two stop_chemicals rows (pool + spa) — otherwise the LEFT JOIN would
-- fan out into a duplicate row per visit.
CREATE OR REPLACE FUNCTION public.get_my_client_visit_history(p_client_id uuid)
RETURNS TABLE (
  route_stop_id uuid,
  route_date date,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rs.id, r.route_date, rs.status, rs.started_at, rs.completed_at, sc.notes
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.clients c ON c.id = rs.client_id
  JOIN public.technicians t ON t.id = c.technician_id
  LEFT JOIN public.stop_chemicals sc ON sc.route_stop_id = rs.id AND sc.body_type = 'pool'
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY r.route_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_visit_history(uuid) TO authenticated;

-- Same return columns as the currently active version (fix_week_route_counts):
-- just pin the "latest chlorine reading" alert source to the pool, so a
-- spa's (independently-ranged) chlorine reading can't drive the pool alert.
CREATE OR REPLACE FUNCTION public.get_my_technician_dashboard(p_date date)
RETURNS TABLE (
  clients_today int,
  completed_today int,
  filters_overdue int,
  pools_with_alert int,
  overdue_invoices int,
  avg_cost_per_visit numeric,
  estimated_route_revenue numeric,
  avg_revenue_per_pool numeric,
  total_pools int,
  seg_routes int,
  ter_routes int,
  qua_routes int,
  qui_routes int,
  sex_routes int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH me AS (
    SELECT id AS tech_id FROM public.technicians WHERE auth_user_id = auth.uid()
  ),
  my_clients AS (
    SELECT c.* FROM public.clients c, me WHERE c.technician_id = me.tech_id
  ),
  today_stops AS (
    SELECT rs.* FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE r.route_date = p_date
  ),
  week_stops AS (
    SELECT rs.*, r.route_date FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE r.route_date >= p_date - ((extract(isodow FROM p_date)::int - 1) * INTERVAL '1 day')
      AND r.route_date < p_date - ((extract(isodow FROM p_date)::int - 1) * INTERVAL '1 day') + INTERVAL '7 days'
  ),
  latest_chem AS (
    SELECT DISTINCT ON (rs.client_id)
      rs.client_id, sc.free_chlorine
    FROM public.stop_chemicals sc
    JOIN public.route_stops rs ON rs.id = sc.route_stop_id
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE sc.body_type = 'pool'
    ORDER BY rs.client_id, r.route_date DESC, sc.created_at DESC
  ),
  month_visits AS (
    SELECT sc.products, r.user_id
    FROM public.stop_chemicals sc
    JOIN public.route_stops rs ON rs.id = sc.route_stop_id
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE date_trunc('month', r.route_date) = date_trunc('month', p_date)
  ),
  month_cost AS (
    SELECT
      count(*) AS visit_count,
      coalesce(sum(
        (SELECT coalesce(sum((prod->>'qty')::numeric * coalesce(pc.cost_per_unit, 0)), 0)
         FROM jsonb_array_elements(mv.products) AS prod
         LEFT JOIN public.product_costs pc ON pc.user_id = mv.user_id AND pc.product_name = prod->>'name')
      ), 0) AS total_cost
    FROM month_visits mv
  )
  SELECT
    (SELECT count(*)::int FROM today_stops),
    (SELECT count(*)::int FROM today_stops WHERE status = 'Concluído'),
    (SELECT count(*)::int FROM my_clients WHERE filter_last_cleaned_at IS NOT NULL AND filter_last_cleaned_at < (p_date - INTERVAL '21 days')),
    (SELECT count(*)::int FROM latest_chem WHERE free_chlorine IS NOT NULL AND free_chlorine < 2),
    (SELECT count(*)::int FROM public.invoices i JOIN my_clients c ON c.id = i.client_id WHERE i.status <> 'PAID' AND i.due_date < p_date),
    (SELECT CASE WHEN visit_count > 0 THEN round(total_cost / visit_count, 2) ELSE 0 END FROM month_cost),
    (SELECT coalesce(sum(monthly_value), 0) FROM my_clients),
    (SELECT CASE WHEN coalesce(sum(cardinality(service_days)), 0) > 0 THEN round(coalesce(sum(monthly_value), 0) / sum(cardinality(service_days)), 2) ELSE 0 END FROM my_clients),
    (SELECT count(*)::int FROM my_clients),
    (SELECT count(*)::int FROM week_stops WHERE extract(isodow FROM route_date) = 1),
    (SELECT count(*)::int FROM week_stops WHERE extract(isodow FROM route_date) = 2),
    (SELECT count(*)::int FROM week_stops WHERE extract(isodow FROM route_date) = 3),
    (SELECT count(*)::int FROM week_stops WHERE extract(isodow FROM route_date) = 4),
    (SELECT count(*)::int FROM week_stops WHERE extract(isodow FROM route_date) = 5);
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_dashboard(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_technician_alerts(p_date date)
RETURNS TABLE (
  alert_type text,
  client_name text,
  days int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH me AS (
    SELECT id AS tech_id FROM public.technicians WHERE auth_user_id = auth.uid()
  ),
  my_clients AS (
    SELECT c.* FROM public.clients c, me WHERE c.technician_id = me.tech_id
  ),
  latest_chem AS (
    SELECT DISTINCT ON (rs.client_id)
      rs.client_id, sc.free_chlorine, r.route_date
    FROM public.stop_chemicals sc
    JOIN public.route_stops rs ON rs.id = sc.route_stop_id
    JOIN public.routes r ON r.id = rs.route_id
    JOIN me ON r.technician_id = me.tech_id
    WHERE sc.body_type = 'pool'
    ORDER BY rs.client_id, r.route_date DESC, sc.created_at DESC
  )
  SELECT 'filtro' AS alert_type, c.name AS client_name, (p_date - c.filter_last_cleaned_at::date)::int AS days
  FROM my_clients c
  WHERE c.filter_last_cleaned_at IS NOT NULL AND c.filter_last_cleaned_at < (p_date - INTERVAL '21 days')
  UNION ALL
  SELECT 'cloro', c.name, (p_date - lc.route_date)::int
  FROM latest_chem lc JOIN my_clients c ON c.id = lc.client_id
  WHERE lc.free_chlorine IS NOT NULL AND lc.free_chlorine < 2
  UNION ALL
  SELECT 'pagamento', c.name, (p_date - i.due_date)::int
  FROM public.invoices i JOIN my_clients c ON c.id = i.client_id
  WHERE i.status <> 'PAID' AND i.due_date < p_date
  ORDER BY days DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_technician_alerts(date) TO authenticated;
