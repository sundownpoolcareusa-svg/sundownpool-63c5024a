import { supabase } from "@/integrations/supabase/client";

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
  service_days?: string[];
  lat?: number | null;
  lng?: number | null;
  created_at: string;
};

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
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
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
  { name: "Green Pool Recovery", description: "Algae treatment and full recovery clean-up", unit_price: 250 },
  { name: "Equipment Repair", description: "Pump, filter or heater repair", unit_price: 150 },
  { name: "Tile Cleaning", description: "Waterline tile scrubbing", unit_price: 90 },
  { name: "Salt System Service", description: "Salt cell cleaning and inspection", unit_price: 120 },
  { name: "Pool Start-Up", description: "Seasonal opening: inspection, cleaning and balancing", unit_price: 200 },
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

export async function createService(values: { name: string; description?: string; unit_price: number }) {
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

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function listTechnicians() {
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
  const { data, error } = await supabase.from("route_stops").select("*, client:clients(*)").eq("id", stopId).single();
  if (error) throw error;
  return data as RouteStop;
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
  const patch: { status: StopStatus; started_at?: string; completed_at?: string } = { status };
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

export async function deleteStop(stopId: string) {
  const { error } = await supabase.from("route_stops").delete().eq("id", stopId);
  if (error) throw error;
}

// ---- Pool chemicals (readings + products logged per stop) ----

export type ChemicalReadingKey = "free_chlorine" | "ph" | "total_alkalinity" | "calcium_hardness" | "stabilizer";

export type ChemicalReadings = Record<ChemicalReadingKey, number>;

export type Product = { name: string; unit: string; qty: number };

export type StopChemicals = {
  id: string;
  route_stop_id: string;
  free_chlorine: number | null;
  ph: number | null;
  total_alkalinity: number | null;
  calcium_hardness: number | null;
  stabilizer: number | null;
  products: Product[];
  notes: string | null;
};

export const CHEMICAL_READING_META: Record<ChemicalReadingKey, { label: string; unit: string; min: number; max: number; step: number }> = {
  free_chlorine: { label: "Free Chlorine", unit: "ppm", min: 2, max: 4, step: 0.1 },
  ph: { label: "pH", unit: "", min: 7.2, max: 7.6, step: 0.1 },
  total_alkalinity: { label: "Total Alkalinity", unit: "ppm", min: 80, max: 120, step: 1 },
  calcium_hardness: { label: "Calcium Hardness", unit: "ppm", min: 200, max: 400, step: 1 },
  stabilizer: { label: "Stabilizer (CYA)", unit: "ppm", min: 30, max: 60, step: 1 },
};

export const DEFAULT_READINGS: ChemicalReadings = {
  free_chlorine: 3.0,
  ph: 7.4,
  total_alkalinity: 90,
  calcium_hardness: 275,
  stabilizer: 50,
};

export const DEFAULT_PRODUCTS: Product[] = [
  { name: "Liquid Chlorine", unit: "gal", qty: 0 },
  { name: "Chlorine Tabs", unit: "tabs", qty: 0 },
  { name: "Muriatic Acid", unit: "gal", qty: 0 },
  { name: "Baking Soda", unit: "lb", qty: 0 },
  { name: "Calcium", unit: "lb", qty: 0 },
  { name: "Stabilizer", unit: "lb", qty: 0 },
];

export function isReadingInRange(key: ChemicalReadingKey, value: number) {
  const meta = CHEMICAL_READING_META[key];
  return value >= meta.min && value <= meta.max;
}

export async function getStopChemicals(stopId: string) {
  const { data, error } = await supabase.from("stop_chemicals").select("*").eq("route_stop_id", stopId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, products: (data.products as unknown as Product[]) ?? [] } as StopChemicals;
}

export async function saveStopChemicals(
  stopId: string,
  values: { readings: ChemicalReadings; products: Product[]; notes: string },
) {
  const { error } = await supabase.from("stop_chemicals").upsert(
    {
      route_stop_id: stopId,
      free_chlorine: values.readings.free_chlorine,
      ph: values.readings.ph,
      total_alkalinity: values.readings.total_alkalinity,
      calcium_hardness: values.readings.calcium_hardness,
      stabilizer: values.readings.stabilizer,
      products: values.products,
      notes: values.notes || null,
    },
    { onConflict: "route_stop_id" },
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
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}
