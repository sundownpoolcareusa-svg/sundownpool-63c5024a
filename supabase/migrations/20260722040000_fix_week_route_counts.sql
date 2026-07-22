-- The "Rota da semana" counts were derived from each client's *default*
-- recurring service_days, not from the route_stops actually scheduled for
-- the current week — so they drifted whenever a one-time visit was added,
-- a recurring stop was skipped, or a client's schedule changed after that
-- week's stops were generated (e.g. today showing "Clientes hoje: 2" while
-- its own weekday card showed a stale "1"). Recompute from real route_stops
-- within the Monday-Sunday week containing p_date instead.

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
