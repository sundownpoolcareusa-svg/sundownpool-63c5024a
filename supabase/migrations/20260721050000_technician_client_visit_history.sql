-- Every scheduled stop for a client (not just ones with logged chemicals),
-- so the Visit History screen can show Total/Completed/Missed counts and a
-- start-end time range per visit. Authorized via the client's technician_id,
-- so it works for any assigned client regardless of today's route.
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
  LEFT JOIN public.stop_chemicals sc ON sc.route_stop_id = rs.id
  WHERE c.id = p_client_id AND t.auth_user_id = auth.uid()
  ORDER BY r.route_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_visit_history(uuid) TO authenticated;
