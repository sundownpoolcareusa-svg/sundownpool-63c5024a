import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  client_type: string;
  status: string;
  notes: string | null;
  service_days: string[];
  monthly_value: number;
  pool_capacity_gallons: number | null;
  pool_filter_type: string | null;
  last_service_date: string | null;
  service_frequency: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

export type Technician = {
  id: string;
  name: string;
  phone: string | null;
  color: string;
  active: boolean;
  created_at: string;
};

export type StopStatus = "Pendente" | "Em serviço" | "Concluído";

export type RouteStop = {
  id: string;
  route_id: string;
  client_id: string;
  position: number;
  scheduled_time: string | null;
  status: StopStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  client?: Client;
};

export type Route = {
  id: string;
  technician_id: string;
  route_date: string;
  status: string;
  technician?: Technician;
  route_stops?: RouteStop[];
};

// ---- Formatting helpers ----

export function fmt(n: number): string {
  return "$" + (Number(n) || 0).toFixed(2);
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Technicians ----

export async function listTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase.from("technicians").select("*").eq("active", true).order("name");
  if (error) throw error;
  return data as Technician[];
}

export async function createTechnician(values: { name: string; phone?: string; color?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("technicians")
    .insert({ ...values, user_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Technician;
}

export async function updateTechnician(id: string, values: Partial<Pick<Technician, "name" | "phone" | "color" | "active">>) {
  const { error } = await supabase.from("technicians").update(values).eq("id", id);
  if (error) throw error;
}

// ---- Clients ----

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw error;
  return data as Client[];
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Client;
}

export async function upsertClient(values: Partial<Client> & { id?: string }) {
  if (values.id) {
    const { id, ...rest } = values;
    const { error } = await supabase.from("clients").update(rest).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, user_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  return (data as Client).id;
}

// ---- Routes & stops ----

export async function listRoutesForDate(date: string): Promise<Route[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("*, technician:technicians(*), route_stops(*, client:clients(*))")
    .eq("route_date", date);
  if (error) throw error;
  return (data as Route[]).map((r) => ({
    ...r,
    route_stops: (r.route_stops ?? []).slice().sort((a, b) => a.position - b.position),
  }));
}

export async function getOrCreateRoute(technicianId: string, date: string): Promise<Route> {
  const { data: existing, error: findErr } = await supabase
    .from("routes")
    .select("*")
    .eq("technician_id", technicianId)
    .eq("route_date", date)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as Route;

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("routes")
    .insert({ user_id: u.user.id, technician_id: technicianId, route_date: date })
    .select()
    .single();
  if (error) throw error;
  return data as Route;
}

export async function getRoute(routeId: string): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .select("*, technician:technicians(*)")
    .eq("id", routeId)
    .single();
  if (error) throw error;
  return data as Route;
}

export async function listRouteStops(routeId: string): Promise<RouteStop[]> {
  const { data, error } = await supabase
    .from("route_stops")
    .select("*, client:clients(*)")
    .eq("route_id", routeId)
    .order("position");
  if (error) throw error;
  return data as RouteStop[];
}

export async function addStopToRoute(routeId: string, clientId: string, scheduledTime?: string) {
  const { data: existing, error: countErr } = await supabase
    .from("route_stops")
    .select("position")
    .eq("route_id", routeId)
    .order("position", { ascending: false })
    .limit(1);
  if (countErr) throw countErr;
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { error } = await supabase.from("route_stops").insert({
    route_id: routeId,
    client_id: clientId,
    position: nextPosition,
    scheduled_time: scheduledTime || null,
  });
  if (error) throw error;
}

export async function updateStopStatus(stopId: string, status: StopStatus, clientId?: string) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status };
  if (status === "Em serviço") patch.started_at = now;
  if (status === "Concluído") patch.completed_at = now;

  const { error } = await supabase.from("route_stops").update(patch).eq("id", stopId);
  if (error) throw error;

  if (status === "Concluído" && clientId) {
    await supabase.from("clients").update({ last_service_date: now.slice(0, 10) }).eq("id", clientId);
  }
}

export async function reorderStops(orderedStopIds: string[]) {
  await Promise.all(
    orderedStopIds.map((id, idx) => supabase.from("route_stops").update({ position: idx }).eq("id", id)),
  );
}

// ---- Aggregates ----

export async function getTodayStats(): Promise<{ total: number; completed: number }> {
  const date = todayStr();
  const { data, error } = await supabase
    .from("routes")
    .select("route_stops(status)")
    .eq("route_date", date);
  if (error) throw error;
  const stops = (data ?? []).flatMap((r: any) => r.route_stops ?? []);
  return { total: stops.length, completed: stops.filter((s: any) => s.status === "Concluído").length };
}

export async function getNextStop(): Promise<RouteStop | null> {
  const date = todayStr();
  const { data, error } = await supabase
    .from("routes")
    .select("route_stops(*, client:clients(*))")
    .eq("route_date", date);
  if (error) throw error;
  const stops = (data ?? []).flatMap((r: any) => r.route_stops ?? []) as RouteStop[];
  const pending = stops
    .filter((s) => s.status !== "Concluído")
    .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  return pending[0] ?? null;
}

export async function getTechnicianProgressToday(): Promise<
  Array<{ technician: Technician; completed: number; total: number }>
> {
  const date = todayStr();
  const { data, error } = await supabase
    .from("routes")
    .select("technician:technicians(*), route_stops(status)")
    .eq("route_date", date);
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const stops = r.route_stops ?? [];
    return {
      technician: r.technician as Technician,
      total: stops.length,
      completed: stops.filter((s: any) => s.status === "Concluído").length,
    };
  });
}
