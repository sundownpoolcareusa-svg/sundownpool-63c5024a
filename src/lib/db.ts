import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state?: string | null;
  zip?: string | null;
  client_type: string;
  status: string;
  stage?: string;
  service_days?: string[];
  service_frequency?: string | null;
  technician_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  filter_last_cleaned_at?: string | null;
  filter_cleaning_count?: number;
  has_spa?: boolean;
  created_at: string;
};

export type BodyType = "pool" | "spa";

export type ClientContact = { name: string; phone: string };

// Street address alone is often ambiguous for geocoding/navigation (e.g. a
// street name that also exists in another state) — always include city/state/zip.
export function clientFullAddress(c: Pick<Client, "address" | "city" | "state" | "zip">) {
  return [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
}

export type EstimateItem = {
  id?: string;
  name: string;
  description: string;
  qty: number;
  unit_price: number;
  total: number;
  position: number;
};

export type BillingType = "total" | "monthly";

export type Estimate = {
  id: string;
  client_id: string;
  number: string;
  title: string | null;
  estimate_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  billing_type: BillingType;
  notes: string | null;
  created_at: string;
  public_token: string;
  client?: Client;
  estimate_items?: EstimateItem[];
};

export type InvoiceItem = {
  id?: string;
  service: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  position: number;
};

export type Invoice = {
  id: string;
  client_id: string;
  estimate_id: string | null;
  number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  public_token: string;
  created_at: string;
  client?: Client;
  invoice_items?: InvoiceItem[];
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  created_at: string;
};

export async function listClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function listEstimates() {
  const { data, error } = await supabase
    .from("estimates")
    .select("*, client:clients(*), estimate_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Estimate[];
}

export async function listInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(*), invoice_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

const DEFAULT_SERVICES: Array<{ name: string; description: string; unit_price: number }> = [
  { name: "Pool Cleaning", description: "Vacuuming, brushing and skimming", unit_price: 100 },
  { name: "Chemical Balance", description: "Water testing and chemical treatment", unit_price: 60 },
  { name: "Filter Cleaning", description: "Filter inspection and cleaning", unit_price: 75 },
  {
    name: "Green Pool Recovery",
    description: "Algae treatment and full recovery clean-up",
    unit_price: 250,
  },
  { name: "Equipment Repair", description: "Pump, filter or heater repair", unit_price: 150 },
  { name: "Tile Cleaning", description: "Waterline tile scrubbing", unit_price: 90 },
  {
    name: "Salt System Service",
    description: "Salt cell cleaning and inspection",
    unit_price: 120,
  },
  {
    name: "Pool Start-Up",
    description: "Seasonal opening: inspection, cleaning and balancing",
    unit_price: 200,
  },
];

export async function listServices() {
  const { data, error } = await supabase.from("services").select("*").order("name");
  if (error) throw error;
  return data as Service[];
}

// Ensures every account has a starter catalog of common services, so estimate/invoice
// line items can be added without retyping the same few services every time.
export async function ensureDefaultServices() {
  const existing = await listServices();
  if (existing.length > 0) return existing;

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return existing;

  const rows = DEFAULT_SERVICES.map((s) => ({ ...s, user_id: u.user!.id }));
  const { data, error } = await supabase.from("services").insert(rows).select();
  if (error) throw error;
  return (data as Service[]).slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function createService(values: {
  name: string;
  description?: string;
  unit_price: number;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("services")
    .insert({ ...values, user_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Service;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// ---- Routes (technicians / routes / route_stops) ----

export type Technician = {
  id: string;
  name: string;
  phone: string | null;
  color: string;
  active: boolean;
  auth_user_id?: string | null;
  home_address?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
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

export type RouteRow = {
  id: string;
  technician_id: string;
  route_date: string;
  status: string;
  technician?: Technician;
  route_stops?: RouteStop[];
};

// Local calendar date (YYYY-MM-DD), NOT toISOString() — that converts to UTC,
// which silently rolls the date forward/back a day whenever local time is
// near midnight relative to the UTC offset (e.g. any evening in US Eastern).
export function todayStr() {
  return dateStr(new Date());
}

export function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function listTechnicians() {
  const { data, error } = await supabase
    .from("technicians")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data as Technician[];
}

export async function setClientTechnician(clientId: string, technicianId: string) {
  const { error } = await supabase
    .from("clients")
    .update({ technician_id: technicianId })
    .eq("id", clientId);
  if (error) throw error;
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

export async function updateTechnician(
  id: string,
  values: { name: string; phone?: string | null; color?: string },
) {
  const { error } = await supabase.from("technicians").update(values).eq("id", id);
  if (error) throw error;
}

// Technicians aren't hard-deleted (routes reference them), just deactivated
// so they drop out of listTechnicians() and the assignment dropdowns.
export async function deactivateTechnician(id: string) {
  const { error } = await supabase.from("technicians").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function listRoutesForDate(date: string) {
  const { data, error } = await supabase
    .from("routes")
    .select("*, technician:technicians(*), route_stops(*, client:clients(*))")
    .eq("route_date", date);
  if (error) throw error;
  return (data as RouteRow[]).map((r) => ({
    ...r,
    route_stops: (r.route_stops ?? []).slice().sort((a, b) => a.position - b.position),
  }));
}

export async function getOrCreateRoute(technicianId: string, date: string) {
  const { data: existing, error: findErr } = await supabase
    .from("routes")
    .select("*")
    .eq("technician_id", technicianId)
    .eq("route_date", date)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as RouteRow;

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("routes")
    .insert({ user_id: u.user.id, technician_id: technicianId, route_date: date })
    .select()
    .single();
  if (error) throw error;
  return data as RouteRow;
}

export async function listRouteStops(routeId: string) {
  const { data, error } = await supabase
    .from("route_stops")
    .select("*, client:clients(*)")
    .eq("route_id", routeId)
    .order("position");
  if (error) throw error;
  return data as RouteStop[];
}

export async function getRouteStop(stopId: string) {
  const { data, error } = await supabase
    .from("route_stops")
    .select("*, client:clients(*)")
    .eq("id", stopId)
    .single();
  if (error) throw error;
  return data as RouteStop;
}

export async function logFilterCleaning(clientId: string) {
  const { data: current, error: readErr } = await supabase
    .from("clients")
    .select("filter_cleaning_count")
    .eq("id", clientId)
    .single();
  if (readErr) throw readErr;
  const { data, error } = await supabase
    .from("clients")
    .update({
      filter_last_cleaned_at: new Date().toISOString(),
      filter_cleaning_count: (current.filter_cleaning_count ?? 0) + 1,
    })
    .eq("id", clientId)
    .select("filter_last_cleaned_at, filter_cleaning_count")
    .single();
  if (error) throw error;
  return data;
}

export async function addStopToRoute(routeId: string, clientId: string, scheduledTime?: string, notes?: string, manual = false) {
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
    notes: notes || null,
    manual,
  });
  if (error) {
    if (error.code === "23505") throw new Error("This client is already on this route.");
    throw error;
  }
}

// A one-time visit is often for a client already on that day's route (e.g. a
// recurring Wednesday client who also needs an extra note for tomorrow) —
// addStopToRoute would just fail on the route_id+client_id unique constraint
// in that case. Attaches the note to the existing stop instead of failing.
// The newly-created stop is flagged `manual` so removeStaleClientStops (which
// cleans up stops that no longer match a client's *recurring* days) never
// treats a deliberately-scheduled one-time visit as stale.
export async function scheduleOneTimeVisit(technicianId: string, date: string, clientId: string, notes: string) {
  const route = await getOrCreateRoute(technicianId, date);
  console.log("[scheduleOneTimeVisit]", { technicianId, date, clientId, routeId: route.id, routeDate: route.route_date });
  const { data: existing, error: findErr } = await supabase
    .from("route_stops")
    .select("id")
    .eq("route_id", route.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (findErr) throw findErr;
  console.log("[scheduleOneTimeVisit] existing stop on this route:", existing);

  if (existing) {
    const { error } = await supabase.from("route_stops").update({ notes: notes || null, manual: true }).eq("id", existing.id);
    if (error) throw error;
  } else {
    await addStopToRoute(route.id, clientId, undefined, notes, true);
  }
}

export async function updateStopStatus(stopId: string, status: StopStatus, clientId?: string) {
  const now = new Date().toISOString();
  const patch: { status: StopStatus; started_at?: string; completed_at?: string } = { status };
  if (status === "Em serviço") patch.started_at = now;
  if (status === "Concluído") patch.completed_at = now;

  const { error } = await supabase.from("route_stops").update(patch).eq("id", stopId);
  if (error) throw error;

  if (status === "Concluído" && clientId) {
    await supabase
      .from("clients")
      .update({ last_service_date: now.slice(0, 10) })
      .eq("id", clientId);
  }
}

export async function reorderStops(orderedStopIds: string[]) {
  await Promise.all(
    orderedStopIds.map((id, idx) =>
      supabase.from("route_stops").update({ position: idx }).eq("id", id),
    ),
  );
}

// ---- Technician self-service login (restricted view — no clients/estimates/invoices access) ----

export type TechnicianStop = {
  stop_id: string;
  route_id: string;
  position: number;
  scheduled_time: string | null;
  status: StopStatus;
  started_at: string | null;
  completed_at: string | null;
  stop_notes: string | null;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
  client_lat: number | null;
  client_lng: number | null;
  client_type: string;
  has_chemicals: boolean;
};

// Returns the technician record linked to the currently logged-in user, or
// null if this login isn't a technician (e.g. it's the owner's account).
// Never throws — this must not be able to block the owner's own sign-in
// (e.g. if the technician-login migration hasn't been applied yet, the
// auth_user_id column simply won't exist, which we treat the same as "not
// a technician" rather than a fatal error).
export async function getMyTechnician() {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("auth_user_id", u.user.id)
      .maybeSingle();
    if (error) return null;
    return data as Technician | null;
  } catch {
    return null;
  }
}

// Lets a technician update their own phone and home address (used to anchor
// route optimization). SECURITY DEFINER RPC, not a direct table update — see
// the technician_profile migration for why.
export async function updateMyTechnicianProfile(values: {
  phone: string | null;
  home_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
}) {
  const { error } = await supabase.rpc("update_my_technician_profile", {
    p_phone: values.phone,
    p_home_address: values.home_address,
    p_home_lat: values.home_lat,
    p_home_lng: values.home_lng,
  });
  if (error) throw error;
}

// Creates any missing recurring stops for the technician's own day before
// reading it, so their route is correct regardless of whether the owner
// happened to open that date first (the owner's auto-schedule effect is
// client-side and only fires for whatever date it's currently viewing).
export async function ensureMyTechnicianStops(date: string) {
  const { error } = await supabase.rpc("ensure_my_technician_stops", { p_date: date });
  if (error) throw error;
}

export async function getMyTechnicianStops(date: string) {
  const { data, error } = await supabase.rpc("get_my_technician_stops", { p_date: date });
  if (error) throw error;
  return (data ?? []) as TechnicianStop[];
}

export type TechnicianClient = {
  client_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  client_type: string;
  status: string;
  service_days: string[] | null;
  monthly_value: number | null;
  pool_photos: string[] | null;
  equipment_photos: string[] | null;
  equipment_notes: string | null;
  has_spa: boolean;
};

// Every client assigned to the signed-in technician (technician_id on the
// client, not scoped to a single day/route) — used by the "Clientes" tab.
export async function getMyTechnicianClients() {
  const { data, error } = await supabase.rpc("get_my_technician_clients");
  if (error) throw error;
  return (data ?? []) as TechnicianClient[];
}

export type ClientChemicalsHistoryEntry = {
  route_stop_id: string;
  route_date: string;
  body_type: BodyType;
  free_chlorine: number | null;
  ph: number | null;
  total_alkalinity: number | null;
  calcium_hardness: number | null;
  stabilizer: number | null;
  salt: number | null;
  products: Product[];
  notes: string | null;
};

// Every chemicals/products entry logged for one client, across all of their
// stops — works even for clients with no visit scheduled today, since it's
// authorized via the client's own technician_id, not a specific stop.
export async function getMyClientChemicalsHistory(clientId: string) {
  const { data, error } = await supabase.rpc("get_my_client_chemicals_history", { p_client_id: clientId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    products: (row.products as unknown as Product[]) ?? [],
  })) as ClientChemicalsHistoryEntry[];
}

export type ClientInvoiceSummary = {
  id: string;
  number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  total: number;
};

// Read-only invoice list for a client — technician can see billing status,
// no create/edit access.
export async function getMyClientInvoices(clientId: string) {
  const { data, error } = await supabase.rpc("get_my_client_invoices", { p_client_id: clientId });
  if (error) throw error;
  return (data ?? []) as ClientInvoiceSummary[];
}

export type ClientVisitHistoryEntry = {
  route_stop_id: string;
  route_date: string;
  status: StopStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
};

// Every scheduled stop for a client (not just ones with logged chemicals) —
// used by the Visit History screen for Total/Completed/Missed counts and
// per-visit time ranges.
export async function getMyClientVisitHistory(clientId: string) {
  const { data, error } = await supabase.rpc("get_my_client_visit_history", { p_client_id: clientId });
  if (error) throw error;
  return (data ?? []) as ClientVisitHistoryEntry[];
}

export async function updateMyClientPoolPhotos(clientId: string, photos: string[]) {
  const { error } = await supabase.rpc("update_my_client_pool_photos", { p_client_id: clientId, p_photos: photos });
  if (error) throw error;
}

export async function updateMyClientEquipment(clientId: string, photos: string[], notes: string) {
  const { error } = await supabase.rpc("update_my_client_equipment", { p_client_id: clientId, p_photos: photos, p_notes: notes });
  if (error) throw error;
}

export type TechnicianDashboardStats = {
  clients_today: number;
  completed_today: number;
  filters_overdue: number;
  pools_with_alert: number;
  overdue_invoices: number;
  avg_cost_per_visit: number;
  estimated_route_revenue: number;
  avg_revenue_per_pool: number;
  total_pools: number;
  seg_routes: number;
  ter_routes: number;
  qua_routes: number;
  qui_routes: number;
  sex_routes: number;
};

// Aggregate stats for the technician's Home dashboard — computed server-side
// (SECURITY DEFINER) since the technician has no direct read access to
// clients' financial fields, chemicals readings, or invoices.
export async function getMyTechnicianDashboard(date: string) {
  const { data, error } = await supabase.rpc("get_my_technician_dashboard", { p_date: date });
  if (error) throw error;
  return (data?.[0] ?? null) as TechnicianDashboardStats | null;
}

export type TechnicianAlert = { alert_type: "filtro" | "cloro" | "pagamento"; client_name: string; days: number };

export async function getMyTechnicianAlerts(date: string) {
  const { data, error } = await supabase.rpc("get_my_technician_alerts", { p_date: date });
  if (error) throw error;
  return (data ?? []) as TechnicianAlert[];
}

export type ServiceJobStatus = "Em serviço" | "Concluído";
export type ServiceJobPriority = "Baixa" | "Média" | "Alta";

export type ServiceJob = {
  job_id: string;
  client_id: string;
  client_name: string;
  title: string;
  notes: string | null;
  status: ServiceJobStatus;
  service_types: string[];
  priority: ServiceJobPriority | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number | null;
  created_at: string;
  completed_at: string | null;
  next_visit_date: string | null;
};

// Ad-hoc jobs (e.g. "Troca de filtro") a technician opens against a client,
// separate from the daily recurring route stop — a job can span more than
// one visit before it's marked done. Pass a status to filter, or omit for
// everything (open jobs first, each group oldest-created first so the
// longest-open job reads as the highest priority).
export async function getMyServiceJobs(status?: ServiceJobStatus) {
  const { data, error } = await supabase.rpc("get_my_service_jobs", { p_status: status ?? undefined });
  if (error) throw error;
  return (data ?? []) as ServiceJob[];
}

export async function createMyServiceJob(values: {
  clientId: string;
  title: string;
  notes: string | null;
  serviceTypes: string[];
  priority: ServiceJobPriority | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
}) {
  const { data, error } = await supabase.rpc("create_my_service_job", {
    p_client_id: values.clientId,
    p_title: values.title,
    p_notes: values.notes ?? undefined,
    p_service_types: values.serviceTypes,
    p_priority: values.priority ?? undefined,
    p_scheduled_date: values.scheduledDate ?? undefined,
    p_scheduled_time: values.scheduledTime ?? undefined,
    p_duration_minutes: values.durationMinutes ?? undefined,
    p_reminder_enabled: values.reminderEnabled,
    p_reminder_minutes_before: values.reminderMinutesBefore ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function completeMyServiceJob(jobId: string) {
  const { error } = await supabase.rpc("complete_my_service_job", { p_job_id: jobId });
  if (error) throw error;
}

// Registers this device's Web Push subscription so the send-service-reminders
// Edge Function can notify the technician about scheduled service jobs, even
// with the app closed. Upserted by (technician, endpoint).
export async function saveMyPushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const { error } = await supabase.rpc("save_my_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
  });
  if (error) throw error;
}

export async function deleteMyPushSubscription(endpoint: string) {
  const { error } = await supabase.rpc("delete_my_push_subscription", { p_endpoint: endpoint });
  if (error) throw error;
}

export async function updateMyStopStatus(stopId: string, status: StopStatus) {
  const { error } = await supabase.rpc("update_my_stop_status", {
    p_stop_id: stopId,
    p_status: status,
  });
  if (error) throw error;
}

export async function getMyStopDetail(stopId: string) {
  const { data, error } = await supabase.rpc("get_my_stop_detail", { p_stop_id: stopId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function logMyStopFilterCleaning(stopId: string) {
  const { data, error } = await supabase.rpc("log_my_stop_filter_cleaning", { p_stop_id: stopId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getMyStopChemicals(stopId: string, bodyType: BodyType = "pool") {
  const { data, error } = await supabase.rpc("get_my_stop_chemicals", { p_stop_id: stopId, p_body_type: bodyType });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return { ...row, products: (row.products as unknown as Product[]) ?? [] };
}

export async function saveMyStopChemicals(
  stopId: string,
  values: { readings: ChemicalReadings; products: Product[]; notes: string },
  bodyType: BodyType = "pool",
) {
  const { error } = await supabase.rpc("save_my_stop_chemicals", {
    p_stop_id: stopId,
    p_free_chlorine: values.readings.free_chlorine,
    p_ph: values.readings.ph,
    p_total_alkalinity: values.readings.total_alkalinity,
    p_calcium_hardness: values.readings.calcium_hardness,
    p_stabilizer: values.readings.stabilizer,
    p_salt: values.readings.salt,
    p_products: values.products as unknown as Json,
    p_notes: values.notes,
    p_body_type: bodyType,
  });
  if (error) throw error;
}

// Same shape as getClientChemicalsHistory (owner side), but scoped through
// the technician RPC boundary instead of a direct table query.
export async function getMyStopChemicalsHistory(stopId: string): Promise<ChemicalHistoryEntry[]> {
  const { data, error } = await supabase.rpc("get_my_stop_chemicals_history", {
    p_stop_id: stopId,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    route_stop_id: row.route_stop_id,
    route_date: row.route_date,
    chemicals: {
      id: `${row.route_stop_id}-${row.body_type}`,
      route_stop_id: row.route_stop_id,
      body_type: row.body_type as BodyType,
      free_chlorine: row.free_chlorine,
      ph: row.ph,
      total_alkalinity: row.total_alkalinity,
      calcium_hardness: row.calcium_hardness,
      stabilizer: row.stabilizer,
      salt: row.salt,
      products: (row.products as unknown as Product[]) ?? [],
      notes: row.notes,
    },
  }));
}

export async function deleteStop(stopId: string) {
  const { data: stop, error: findErr } = await supabase
    .from("route_stops")
    .select("route_id")
    .eq("id", stopId)
    .single();
  if (findErr) throw findErr;

  const { error } = await supabase.from("route_stops").delete().eq("id", stopId);
  if (error) throw error;

  await compactStopPositions(stop.route_id);
}

// Moves a stop to a different day, keeping the same technician — used to
// edit a manually-scheduled one-time visit's date from the client's
// "Visitas agendadas" list. Reuses the same route (creating it if needed)
// and position logic as scheduling a new one-time visit.
export async function rescheduleStop(stopId: string, newDate: string) {
  const { data: stop, error: findErr } = await supabase
    .from("route_stops")
    .select("route_id, route:routes(technician_id, route_date)")
    .eq("id", stopId)
    .single();
  if (findErr) throw findErr;

  const route = stop.route as { technician_id: string; route_date: string } | null;
  if (!route) throw new Error("Route not found for this stop");
  if (route.route_date === newDate) return;

  const oldRouteId = stop.route_id;
  const newRoute = await getOrCreateRoute(route.technician_id, newDate);

  const { data: existing, error: countErr } = await supabase
    .from("route_stops")
    .select("position")
    .eq("route_id", newRoute.id)
    .order("position", { ascending: false })
    .limit(1);
  if (countErr) throw countErr;
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { error } = await supabase
    .from("route_stops")
    .update({ route_id: newRoute.id, position: nextPosition })
    .eq("id", stopId);
  if (error) {
    if (error.code === "23505") throw new Error("This client already has a visit scheduled that day.");
    throw error;
  }

  await compactStopPositions(oldRouteId);
}

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Stops are only ever auto-added for a client's matching weekdays, never
// reconciled — so editing a client's service_days would otherwise leave old
// still-pending stops sitting on days the client is no longer scheduled for.
// Removes any not-yet-started stop, today or later, whose weekday fell out
// of the client's current service_days. Manual stops (one-time visits, or
// anything added by hand from the Rotas page) are excluded — they aren't
// tied to the recurring schedule, so a service_days edit should never
// delete them.
export async function removeStaleClientStops(clientId: string, serviceDays: string[]) {
  const { data, error } = await supabase
    .from("route_stops")
    .select("id, route_id, manual, notes, route:routes(route_date)")
    .eq("client_id", clientId)
    .eq("status", "Pendente")
    .eq("manual", false);
  if (error) throw error;

  const todayStr = localDateStr(new Date());
  // TEMP DEBUG: logging every candidate row so we can see exactly why a
  // stop is (or isn't) being treated as stale — remove once the one-time
  // visit disappearing bug is confirmed fixed.
  console.log("[removeStaleClientStops]", { clientId, serviceDays, todayStr, rows: data });
  const stale = (data ?? []).filter((s) => {
    // Belt-and-suspenders: a note is only ever set by a one-time visit, so
    // treat it as manual too even if the `manual` flag itself is somehow off
    // (e.g. a row created before that column existed).
    if (s.manual || s.notes) return false;
    const routeDate = (s.route as { route_date: string } | null)?.route_date;
    if (!routeDate || routeDate < todayStr) return false;
    const abbr = WEEKDAY_ABBR[new Date(`${routeDate}T00:00:00`).getDay()];
    return !serviceDays.includes(abbr);
  });
  console.log("[removeStaleClientStops] stale:", stale);
  if (stale.length === 0) return;

  const staleIds = stale.map((s) => s.id);
  const { error: delErr } = await supabase.from("route_stops").delete().in("id", staleIds);
  if (delErr) throw delErr;

  const affectedRouteIds = [...new Set(stale.map((s) => s.route_id))];
  await Promise.all(affectedRouteIds.map((routeId) => compactStopPositions(routeId)));
}

// Deleting a stop never renumbers the ones left behind, so gaps (e.g. "2, 3"
// instead of "1, 2") build up on the stop-number badges shown to the
// technician. Re-packs remaining stops on a route to sequential positions.
async function compactStopPositions(routeId: string) {
  const { data, error } = await supabase
    .from("route_stops")
    .select("id")
    .eq("route_id", routeId)
    .order("position");
  if (error) throw error;
  await reorderStops((data ?? []).map((s) => s.id));
}

// ---- Pool chemicals (readings + products logged per stop) ----

export type ChemicalReadingKey =
  | "free_chlorine"
  | "ph"
  | "total_alkalinity"
  | "calcium_hardness"
  | "stabilizer"
  | "salt";

export type ChemicalReadings = Record<ChemicalReadingKey, number>;

export type Product = { name: string; unit: string; qty: number; step?: number };

export type StopChemicals = {
  id: string;
  route_stop_id: string;
  body_type: BodyType;
  free_chlorine: number | null;
  ph: number | null;
  total_alkalinity: number | null;
  calcium_hardness: number | null;
  stabilizer: number | null;
  salt: number | null;
  products: Product[];
  notes: string | null;
};

export const CHEMICAL_READING_META: Record<
  ChemicalReadingKey,
  { label: string; unit: string; min: number; max: number; step: number }
> = {
  free_chlorine: { label: "Free Chlorine", unit: "ppm", min: 2, max: 4, step: 0.1 },
  ph: { label: "pH", unit: "", min: 7.2, max: 7.6, step: 0.1 },
  total_alkalinity: { label: "Total Alkalinity", unit: "ppm", min: 80, max: 120, step: 1 },
  calcium_hardness: { label: "Calcium Hardness", unit: "ppm", min: 200, max: 400, step: 1 },
  stabilizer: { label: "Stabilizer (CYA)", unit: "ppm", min: 30, max: 60, step: 1 },
  salt: { label: "Salt Pool", unit: "ppm", min: 2700, max: 3400, step: 50 },
};

export const DEFAULT_READINGS: ChemicalReadings = {
  free_chlorine: 3.0,
  ph: 7.4,
  total_alkalinity: 90,
  calcium_hardness: 275,
  stabilizer: 50,
  salt: 3200,
};

export const DEFAULT_PRODUCTS: Product[] = [
  { name: "Liquid Chlorine", unit: "gal", qty: 0, step: 0.5 },
  { name: "Chlorine Tabs", unit: "tabs", qty: 0, step: 1 },
  { name: "Muriatic Acid", unit: "gal", qty: 0, step: 0.25 },
  { name: "Baking Soda", unit: "scoop", qty: 0, step: 0.5 },
  { name: "Calcium", unit: "scoop", qty: 0, step: 0.5 },
  { name: "Stabilizer", unit: "scoop", qty: 0, step: 0.5 },
  { name: "Salt Bag", unit: "bag", qty: 0, step: 1 },
];

const QTY_FRACTIONS: Record<string, string> = { "0.25": "¼", "0.50": "½", "0.75": "¾" };

// Renders fractional product quantities the way technicians write them by
// hand (1/4, 1/2, 3/4 gallon; 1/2, 1 1/2 scoop) instead of decimals.
export function formatProductQty(qty: number) {
  if (qty === 0) return "0";
  const whole = Math.floor(qty);
  const fracKey = (Math.round((qty - whole) * 100) / 100).toFixed(2);
  const fracStr = QTY_FRACTIONS[fracKey];
  if (!fracStr) return qty.toFixed(1).replace(/\.0$/, "");
  return whole === 0 ? fracStr : `${whole} ${fracStr}`;
}

// Loaded chemicals records store a snapshot of the product list as it was
// when saved, so a stop saved before a unit/step change (e.g. lb -> scoop)
// would otherwise show stale units forever. Keeps the saved quantities but
// always takes unit/step from the current DEFAULT_PRODUCTS, so config
// changes apply everywhere immediately. Custom products the technician
// added by name (not in DEFAULT_PRODUCTS) are kept as-is.
export function mergeSavedProducts(saved: Product[]): Product[] {
  const known = DEFAULT_PRODUCTS.map((def) => ({
    ...def,
    qty: saved.find((p) => p.name === def.name)?.qty ?? def.qty,
  }));
  const custom = saved.filter((p) => !DEFAULT_PRODUCTS.some((def) => def.name === p.name));
  return [...known, ...custom];
}

export function isReadingInRange(key: ChemicalReadingKey, value: number) {
  const meta = CHEMICAL_READING_META[key];
  return value >= meta.min && value <= meta.max;
}

export async function getStopChemicals(stopId: string, bodyType: BodyType = "pool") {
  const { data, error } = await supabase
    .from("stop_chemicals")
    .select("*")
    .eq("route_stop_id", stopId)
    .eq("body_type", bodyType)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, products: (data.products as unknown as Product[]) ?? [] } as StopChemicals;
}

export async function saveStopChemicals(
  stopId: string,
  values: { readings: ChemicalReadings; products: Product[]; notes: string },
  bodyType: BodyType = "pool",
) {
  const { error } = await supabase.from("stop_chemicals").upsert(
    {
      route_stop_id: stopId,
      body_type: bodyType,
      free_chlorine: values.readings.free_chlorine,
      ph: values.readings.ph,
      total_alkalinity: values.readings.total_alkalinity,
      calcium_hardness: values.readings.calcium_hardness,
      stabilizer: values.readings.stabilizer,
      salt: values.readings.salt,
      products: values.products,
      notes: values.notes || null,
    },
    { onConflict: "route_stop_id,body_type" },
  );
  if (error) throw error;
}

export type ChemicalHistoryEntry = {
  route_stop_id: string;
  route_date: string;
  chemicals: StopChemicals;
};

// Every chemical reading logged for this client, across all of their route
// stops (including today's, if already saved), newest first — used by the
// "History" view on the chemicals page.
export async function getClientChemicalsHistory(clientId: string) {
  const { data: stops, error: stopsErr } = await supabase
    .from("route_stops")
    .select("id, route:routes(route_date)")
    .eq("client_id", clientId);
  if (stopsErr) throw stopsErr;

  const stopIds = (stops ?? []).map((s) => s.id);
  if (stopIds.length === 0) return [];

  const { data: chem, error: chemErr } = await supabase
    .from("stop_chemicals")
    .select("*")
    .in("route_stop_id", stopIds);
  if (chemErr) throw chemErr;

  const dateByStop = new Map(
    (stops ?? []).map((s) => [s.id, (s.route as { route_date: string } | null)?.route_date ?? ""]),
  );

  return (chem ?? [])
    .map((c) => ({
      route_stop_id: c.route_stop_id,
      route_date: dateByStop.get(c.route_stop_id) ?? "",
      chemicals: { ...c, products: (c.products as unknown as Product[]) ?? [] } as StopChemicals,
    }))
    .sort((a, b) => b.route_date.localeCompare(a.route_date)) as ChemicalHistoryEntry[];
}

export type ChemicalVisitEntry = {
  route_stop_id: string;
  route_date: string;
  client_id: string;
  client_name: string;
  chemicals: StopChemicals;
};

// Every chemicals entry logged across ALL clients (not scoped to one), newest
// first — used by the Químicos page to compute the product cost of each visit.
export async function listAllChemicalsHistory(): Promise<ChemicalVisitEntry[]> {
  const { data: stops, error: stopsErr } = await supabase
    .from("route_stops")
    .select("id, client_id, client:clients(name), route:routes(route_date)");
  if (stopsErr) throw stopsErr;

  const { data: chem, error: chemErr } = await supabase.from("stop_chemicals").select("*");
  if (chemErr) throw chemErr;

  const stopById = new Map((stops ?? []).map((s) => [s.id, s]));

  return (chem ?? [])
    .map((c) => {
      const stop = stopById.get(c.route_stop_id);
      return {
        route_stop_id: c.route_stop_id,
        route_date: (stop?.route as { route_date: string } | null)?.route_date ?? "",
        client_id: stop?.client_id ?? "",
        client_name: (stop?.client as { name: string } | null)?.name ?? "—",
        chemicals: { ...c, products: (c.products as unknown as Product[]) ?? [] } as StopChemicals,
      };
    })
    .filter((e) => e.route_date)
    .sort((a, b) => b.route_date.localeCompare(a.route_date));
}

export type ProductCost = { product_name: string; cost_per_unit: number };

export async function listProductCosts(): Promise<ProductCost[]> {
  const { data, error } = await supabase
    .from("product_costs")
    .select("product_name, cost_per_unit");
  if (error) throw error;
  return (data ?? []) as ProductCost[];
}

export async function upsertProductCost(productName: string, costPerUnit: number) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("product_costs")
    .upsert(
      { user_id: u.user.id, product_name: productName, cost_per_unit: costPerUnit },
      { onConflict: "user_id,product_name" },
    );
  if (error) throw error;
}

export function fmt(n: number) {
  return `$${(n ?? 0).toFixed(2)}`;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function nextNumber(prefix: string, existing: string[]) {
  const year = new Date().getFullYear();
  const rx = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    const m = n.match(rx);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
