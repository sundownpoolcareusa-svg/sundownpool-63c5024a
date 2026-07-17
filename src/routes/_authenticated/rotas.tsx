import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import {
  Plus, Phone, ChevronUp, ChevronDown, Check, Play, Trash2, MapPin, CalendarDays,
} from "lucide-react";
import {
  listTechnicians, createTechnician, listRoutesForDate, getOrCreateRoute, listRouteStops,
  addStopToRoute, updateStopStatus, reorderStops, deleteStop, listClients, initials,
  type RouteStop, type StopStatus, type Technician, type Client,
} from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rotas")({
  component: RotasPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const STATUS_STYLES: Record<StopStatus, { bg: string; text: string }> = {
  "Pendente": { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" },
  "Em serviço": { bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" },
  "Concluído": { bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" },
};

function StatusBadge({ status }: { status: StopStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["Pendente"];
  return (
    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

function nextStatus(status: StopStatus): StopStatus | null {
  if (status === "Pendente") return "Em serviço";
  if (status === "Em serviço") return "Concluído";
  return null;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function weekDays(center: Date) {
  const start = new Date(center);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// Weekday abbreviations matching the clients form's "Recurring Service Days" values
const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function RotasPage() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [technicianId, setTechnicianId] = useState<string>("all");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [newRouteOpen, setNewRouteOpen] = useState(false);

  const dateStr = toDateStr(selectedDate);
  const days = weekDays(selectedDate);

  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });
  const { data: routes = [] } = useQuery({ queryKey: ["routes-for-date", dateStr], queryFn: () => listRoutesForDate(dateStr) });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });

  const filteredRoutes = technicianId === "all" ? routes : routes.filter((r) => r.technician_id === technicianId);
  const activeRoute = routes.find((r) => r.id === selectedRouteId) ?? filteredRoutes[0] ?? null;

  const allStops = useMemo(
    () => filteredRoutes.flatMap((r) => (r.route_stops ?? []).map((s) => ({ ...s, technicianName: r.technician?.name }))),
    [filteredRoutes],
  );

  // Clients with this weekday in their recurring service days, not yet scheduled on any route today
  const recurringClients = useMemo(() => {
    const abbr = WEEKDAY_ABBR[selectedDate.getDay()];
    const scheduled = new Set(routes.flatMap((r) => (r.route_stops ?? []).map((s) => s.client_id)));
    return clients.filter(
      (c) => (c.service_days ?? []).includes(abbr) && c.status !== "Inativo" && !scheduled.has(c.id),
    );
  }, [clients, routes, selectedDate]);

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12">
        {/* LEFT */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-extrabold text-[var(--dash-text)]">Routes</h1>
            <button onClick={() => setNewRouteOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> New Route
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {days.map((d) => {
              const active = toDateStr(d) === dateStr;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className="flex shrink-0 flex-col items-center gap-0.5 rounded-[11px] px-3 py-2 text-xs font-semibold"
                  style={{ background: active ? "var(--dash-navy)" : "var(--dash-surface-soft)", color: active ? "#fff" : "var(--dash-text-secondary)" }}
                >
                  <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="text-sm">{d.getDate()}</span>
                </button>
              );
            })}
          </div>

          <select
            value={technicianId}
            onChange={(e) => { setTechnicianId(e.target.value); setSelectedRouteId(null); }}
            className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--dash-text)]"
          >
            <option value="all">All technicians</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--dash-text)]">{allStops.length} stops</span>
            <span className="text-[var(--dash-text-muted)]">{allStops.filter((s) => s.status === "Concluído").length} done</span>
          </div>

          {allStops.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-10 text-center">
              <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
              <p className="mt-2 text-sm text-[var(--dash-text-muted)]">No routes this day.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRoutes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className="block w-full rounded-[18px] border p-4 text-left"
                  style={{ borderColor: activeRoute?.id === r.id ? "var(--dash-navy)" : "var(--dash-border)", background: activeRoute?.id === r.id ? "var(--dash-water-bg)" : "#fff", ...cardShadow }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--dash-navy)]">{r.technician?.name}</span>
                    <span className="text-xs text-[var(--dash-text-muted)]">{(r.route_stops ?? []).length} stops</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {recurringClients.length > 0 && (
            <RecurringSuggestions
              clients={recurringClients}
              technicianId={technicianId}
              technicians={technicians}
              date={dateStr}
              onAdded={(routeId) => { setSelectedRouteId(routeId); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); }}
            />
          )}
        </aside>

        {/* CENTER */}
        <section className="space-y-4 lg:col-span-6">
          {activeRoute ? (
            <RouteDetail route={activeRoute} onChanged={() => qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] })} />
          ) : (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white p-16 text-center">
              <MapPin className="mx-auto h-12 w-12 text-[var(--dash-text-muted)]" />
              <p className="mt-4 text-lg font-semibold text-[var(--dash-text-secondary)]">No route selected</p>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">Click "New Route" to schedule technicians for the day.</p>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 lg:col-span-3">
          <TechniciansCard technicians={technicians} />
        </aside>
      </main>

      <NewRouteModal
        open={newRouteOpen}
        onClose={() => setNewRouteOpen(false)}
        date={dateStr}
        technicians={technicians}
        onCreated={(routeId) => { setSelectedRouteId(routeId); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); }}
      />
    </div>
  );
}

function RecurringSuggestions({
  clients, technicianId, technicians, date, onAdded,
}: { clients: Client[]; technicianId: string; technicians: Technician[]; date: string; onAdded: (routeId: string) => void }) {
  const addMut = useMutation({
    mutationFn: async ({ client, techId }: { client: Client; techId: string }) => {
      const route = await getOrCreateRoute(techId, date);
      await addStopToRoute(route.id, client.id);
      return route.id;
    },
    onSuccess: (routeId, { client }) => {
      toast.success(`${client.name} added to today's route`);
      onAdded(routeId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function add(client: Client) {
    if (technicianId === "all") {
      if (technicians.length === 1) {
        addMut.mutate({ client, techId: technicians[0].id });
      } else {
        toast.error("Select a technician above first");
      }
      return;
    }
    addMut.mutate({ client, techId: technicianId });
  }

  return (
    <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4" style={cardShadow}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--dash-text)]">
        <CalendarDays className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} />
        Recurring today
      </div>
      <p className="mb-2 text-xs text-[var(--dash-text-muted)]">
        Clients scheduled for this weekday who aren't on a route yet.
      </p>
      <div className="space-y-1.5">
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => add(c)}
            disabled={addMut.isPending}
            className="flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-sm hover:bg-[var(--dash-bg)] disabled:opacity-50"
          >
            <span className="truncate font-medium text-[var(--dash-text)]">{c.name}</span>
            <Plus className="h-4 w-4 shrink-0" style={{ color: "var(--dash-link)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TechniciansCard({ technicians }: { technicians: Technician[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const mut = useMutation({
    mutationFn: () => createTechnician({ name, phone }),
    onSuccess: () => {
      toast.success("Technician added!");
      setName(""); setPhone(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]" style={cardShadow}>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-bold text-[var(--dash-text)]">Technicians</div>
        <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold" style={{ color: "var(--dash-link)" }}>+ Add</button>
      </div>
      {open && (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          <button disabled={mut.isPending} className="w-full rounded-[10px] bg-[var(--dash-navy)] py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Saving..." : "Save"}
          </button>
        </form>
      )}
      <div className="space-y-2">
        {technicians.map((t) => (
          <div key={t.id} className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: t.color }}>
              {initials(t.name)}
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--dash-text)]">{t.name}</div>
              <div className="text-xs text-[var(--dash-text-muted)]">{t.phone || "—"}</div>
            </div>
          </div>
        ))}
        {technicians.length === 0 && <p className="text-sm text-[var(--dash-text-muted)]">No technicians yet.</p>}
      </div>
    </div>
  );
}

function NewRouteModal({
  open, onClose, date, technicians, onCreated,
}: { open: boolean; onClose: () => void; date: string; technicians: Technician[]; onCreated: (routeId: string) => void }) {
  const [technicianId, setTechnicianId] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!technicianId) throw new Error("Select a technician");
      return getOrCreateRoute(technicianId, date);
    },
    onSuccess: (route) => {
      toast.success("Route ready!");
      onCreated(route.id);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Route" maxWidth="max-w-md">
      {technicians.length === 0 ? (
        <p className="text-sm text-[var(--dash-text-secondary)]">Add a technician first (right column) before creating a route.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Technician *</label>
            <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option value="">Select...</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
            <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {mut.isPending ? "Creating..." : "Create Route"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RouteDetail({ route, onChanged }: { route: { id: string; technician?: Technician }; onChanged: () => void }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const { data: stops = [] } = useQuery({ queryKey: ["route-stops", route.id], queryFn: () => listRouteStops(route.id) });

  const statusMut = useMutation({
    mutationFn: ({ stop, status }: { stop: RouteStop; status: StopStatus }) => updateStopStatus(stop.id, status, stop.client_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-stops", route.id] }); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorderStops(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-stops", route.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => deleteStop(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-stops", route.id] }); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(index: number, dir: -1 | 1) {
    const next = [...stops];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMut.mutate(next.map((s) => s.id));
  }

  const completed = stops.filter((s) => s.status === "Concluído").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white" style={{ background: route.technician?.color || "var(--dash-navy)" }}>
            {initials(route.technician?.name || "?")}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--dash-text)]">{route.technician?.name}</h2>
            <div className="text-xs text-[var(--dash-text-muted)]">
              {stops.length} stops • <span style={{ color: "var(--dash-green)" }}>{completed} done</span>
            </div>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Add Stop
        </button>
      </div>

      <div className="space-y-2.5">
        {stops.map((stop, i) => {
          const next = nextStatus(stop.status);
          return (
            <div key={stop.id} className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4" style={cardShadow}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: stop.status === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[var(--dash-text)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</div>
                    <StatusBadge status={stop.status} />
                  </div>
                  <Link to="/clientes" className="mt-1 block truncate font-semibold text-[var(--dash-text)] hover:underline">{stop.client?.name}</Link>
                  <div className="truncate text-xs text-[var(--dash-text-muted)]">{stop.client?.address}</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {stop.client?.phone && (
                  <a href={`tel:${stop.client.phone}`} className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--dash-border)]" style={{ color: "var(--dash-navy)" }}>
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {next && (
                  <button
                    onClick={() => statusMut.mutate({ stop, status: next })}
                    disabled={statusMut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[10px] py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                  >
                    {next === "Concluído" ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {next === "Concluído" ? "Complete" : "Start"}
                  </button>
                )}
                <button onClick={() => removeMut.mutate(stop.id)} className="grid h-9 w-9 place-items-center rounded-[10px] border" style={{ borderColor: "var(--dash-red-border)", color: "var(--dash-red)" }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {stops.length === 0 && (
          <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-10 text-center">
            <p className="text-sm text-[var(--dash-text-muted)]">No stops yet. Click "Add Stop" to schedule a client visit.</p>
          </div>
        )}
      </div>

      <AddStopModal open={addOpen} onClose={() => setAddOpen(false)} routeId={route.id} onAdded={() => { qc.invalidateQueries({ queryKey: ["route-stops", route.id] }); onChanged(); }} />
    </>
  );
}

function AddStopModal({ open, onClose, routeId, onAdded }: { open: boolean; onClose: () => void; routeId: string; onAdded: () => void }) {
  const [clientId, setClientId] = useState("");
  const [time, setTime] = useState("");
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });

  const mut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client");
      await addStopToRoute(routeId, clientId, time || undefined);
    },
    onSuccess: () => {
      toast.success("Stop added!");
      setClientId(""); setTime("");
      onAdded(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Stop" maxWidth="max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Client *</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
            <option value="">Select...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
          <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Adding..." : "Add Stop"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
