import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import {
  Plus, Phone, ChevronUp, ChevronDown, Check, Play, Trash2, MapPin, CalendarDays,
  ListChecks, CheckCircle2, Clock, Flag, Home, LocateFixed, Navigation,
} from "lucide-react";
import {
  listTechnicians, createTechnician, listRoutesForDate, getOrCreateRoute, listRouteStops,
  addStopToRoute, updateStopStatus, reorderStops, deleteStop, listClients, initials,
  type RouteStop, type StopStatus, type Technician, type Client, type RouteRow,
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

const WEEKDAY_LONG = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
// Weekday abbreviations matching the clients form's "Recurring Service Days" values
const WEEKDAY_ABBR = WEEKDAY_LONG;

// Deterministic, cycling positions for the decorative placeholder map — not
// tied to real geography, just spreads stops out visually.
const MAP_POSITIONS = [
  { x: 16, y: 74 }, { x: 24, y: 62 }, { x: 33, y: 50 }, { x: 44, y: 40 }, { x: 55, y: 30 },
  { x: 66, y: 20 }, { x: 77, y: 12 }, { x: 20, y: 20 }, { x: 40, y: 66 }, { x: 60, y: 56 },
  { x: 70, y: 70 }, { x: 30, y: 34 }, { x: 50, y: 80 }, { x: 80, y: 40 },
];
const MAP_LABELS = [
  { text: "Longboat Key", x: 10, y: 10 },
  { text: "Sarasota", x: 30, y: 40 },
  { text: "Fruitville", x: 62, y: 34 },
  { text: "Bee Ridge", x: 58, y: 58 },
  { text: "Siesta Key", x: 14, y: 78 },
  { text: "Osprey", x: 36, y: 76 },
  { text: "Venice", x: 56, y: 92 },
];

function statusMarkerColor(status: StopStatus) {
  if (status === "Concluído") return "#16A34A";
  if (status === "Em serviço") return "#2563EB";
  return "#94A3B8";
}

function RouteMap({ stops }: { stops: RouteStop[] }) {
  const points = stops.map((s, i) => ({ ...MAP_POSITIONS[i % MAP_POSITIONS.length], s }));
  const current = points.find((p) => p.s.status === "Em serviço") ?? points.find((p) => p.s.status === "Pendente");
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className="relative h-56 w-full overflow-hidden rounded-2xl border border-[var(--dash-border)] lg:h-[360px]"
      style={{ background: "linear-gradient(160deg, #EAF3E8 0%, #E4F0F5 55%, #DCEAF4 100%)" }}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="rotasMapGrid" width="7%" height="9%" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 0 100 M 0 0 L 100 0" stroke="#D3E2DC" strokeWidth="1" fill="none" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rotasMapGrid)" />
        <path d="M 0 8 C 12 20, 8 55, 22 100" stroke="#BEDDEE" strokeWidth="7" fill="none" opacity="0.8" />
        <path d="M 5 0 C 35 25, 30 50, 60 60 S 80 90, 100 95" stroke="#F2E7C4" strokeWidth="3.5" fill="none" opacity="0.7" />
      </svg>

      {MAP_LABELS.map((l) => (
        <span
          key={l.text}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[var(--dash-text-muted-2)]"
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
        >
          {l.text}
        </span>
      ))}

      {points.length > 1 && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={line} fill="none" stroke="#2563EB" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        </svg>
      )}

      {points.map((p, i) => (
        <div
          key={p.s.id}
          className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-md"
          style={{ left: `${p.x}%`, top: `${p.y}%`, background: statusMarkerColor(p.s.status) }}
          title={p.s.client?.name}
        >
          {i + 1}
        </div>
      ))}

      {current && (
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${current.x}%`, top: `${current.y}%` }}>
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" className="absolute inset-0">
            <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 25 17 25s17-13 17-25C34 7.6 26.4 0 17 0Z" fill="var(--dash-navy)" stroke="white" strokeWidth="2" />
          </svg>
          <div className="relative grid h-[34px] w-[34px] place-items-center">
            <Home className="h-[16px] w-[16px] text-white" />
          </div>
        </div>
      )}

      <button className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--dash-navy)] shadow-md" title="Minha localização">
        <LocateFixed className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, tint, value, label }: { icon: typeof ListChecks; tint: string; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: `${tint}1A`, color: tint }}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="text-2xl font-extrabold text-[var(--dash-text)]">{value}</div>
      <div className="text-[12px] font-medium text-[var(--dash-text-muted-2)]">{label}</div>
    </div>
  );
}

function routeStats(stops: RouteStop[]) {
  const completed = stops.filter((s) => s.status === "Concluído").length;
  const timed = stops.filter((s) => s.scheduled_time);
  const finish = timed.length
    ? timed.reduce((max, s) => (s.scheduled_time! > max ? s.scheduled_time! : max), timed[0].scheduled_time!).slice(0, 5)
    : "—";
  return {
    total: stops.length,
    completed,
    remaining: stops.length - completed,
    finish,
  };
}

function TechnicianChips({
  technicians, techStats, selectedId, focusedId, onSelect, onAddClick,
}: {
  technicians: Technician[];
  techStats: Map<string, { total: number; completed: number }>;
  selectedId: string;
  focusedId?: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect("all")}
        className="flex min-w-[120px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-3 text-center"
        style={{
          borderColor: selectedId === "all" ? "var(--dash-navy)" : "var(--dash-border)",
          background: selectedId === "all" ? "var(--dash-water-bg)" : "#fff",
        }}
      >
        <span className="text-[13px] font-bold text-[var(--dash-text)]">All</span>
        <span className="text-[11px] text-[var(--dash-text-muted-2)]">technicians</span>
      </button>
      {technicians.map((t) => {
        const stats = techStats.get(t.id) ?? { total: 0, completed: 0 };
        const active = selectedId === t.id;
        const focused = !active && selectedId === "all" && focusedId === t.id;
        const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex min-w-[190px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left"
            style={{
              borderColor: active ? "var(--dash-navy)" : focused ? "var(--dash-navy-2)" : "var(--dash-border)",
              background: active ? "var(--dash-water-bg)" : "#fff",
            }}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: t.color }}>
              {initials(t.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{t.name}</div>
              <div className="text-[11px] text-[var(--dash-text-muted-2)]">{stats.total} stops · {stats.completed} done</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dash-bg)]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
              </div>
            </div>
          </button>
        );
      })}
      <button
        onClick={onAddClick}
        className="flex min-w-[52px] shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--dash-border)] text-[var(--dash-text-muted)]"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function RotasPage() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [technicianId, setTechnicianId] = useState<string>("all");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTechOpen, setAddTechOpen] = useState(false);

  const dateStr = toDateStr(selectedDate);
  const days = weekDays(selectedDate);

  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });
  const { data: routes = [] } = useQuery({ queryKey: ["routes-for-date", dateStr], queryFn: () => listRoutesForDate(dateStr) });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });

  const filteredRoutes = technicianId === "all" ? routes : routes.filter((r) => r.technician_id === technicianId);
  const activeRoute: RouteRow | null = routes.find((r) => r.id === selectedRouteId) ?? filteredRoutes[0] ?? null;

  const { data: stops = [] } = useQuery({
    queryKey: ["route-stops", activeRoute?.id],
    queryFn: () => listRouteStops(activeRoute!.id),
    enabled: !!activeRoute,
  });

  const techStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const r of routes) {
      const list = r.route_stops ?? [];
      map.set(r.technician_id, { total: list.length, completed: list.filter((s) => s.status === "Concluído").length });
    }
    return map;
  }, [routes]);

  // Cards always mirror the route shown below (not an all-technicians total),
  // so the numbers on screen never disagree with the list/map underneath them.
  const summary = routeStats(stops);

  const recurringClients = useMemo(() => {
    const abbr = WEEKDAY_ABBR[selectedDate.getDay()];
    const scheduled = new Set(routes.flatMap((r) => (r.route_stops ?? []).map((s) => s.client_id)));
    return clients.filter((c) => (c.service_days ?? []).includes(abbr) && c.status !== "Inativo" && !scheduled.has(c.id));
  }, [clients, routes, selectedDate]);

  const statusMut = useMutation({
    mutationFn: ({ stop, status }: { stop: RouteStop; status: StopStatus }) => updateStopStatus(stop.id, status, stop.client_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] }); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorderStops(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => deleteStop(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] }); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(index: number, dir: -1 | 1) {
    const next = [...stops];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMut.mutate(next.map((s) => s.id));
  }

  function selectTechnician(id: string) {
    setTechnicianId(id);
    setSelectedRouteId(null);
  }

  const cards = [
    { icon: ListChecks, tint: "#2563EB", value: summary.total, label: "Total stops" },
    { icon: CheckCircle2, tint: "#16A34A", value: summary.completed, label: "Completed" },
    { icon: Clock, tint: "#E8813A", value: summary.remaining, label: "Remaining" },
    { icon: Flag, tint: "#7C3AED", value: summary.finish, label: "Predicted finish" },
  ];

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] lg:pl-60">
      <AppSidebar />
      <AppHeader />

      {/* MOBILE */}
      <div className="space-y-4 p-3 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-extrabold text-[var(--dash-text)]">Routes</h1>
          <button onClick={() => setNewRouteOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>

        <DaySelector days={days} dateStr={dateStr} onSelect={setSelectedDate} />
        <TechnicianChips technicians={technicians} techStats={techStats} selectedId={technicianId} focusedId={activeRoute?.technician_id} onSelect={selectTechnician} onAddClick={() => setAddTechOpen(true)} />

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>

        {activeRoute ? (
          <>
            <RouteMap stops={stops} />
            <StopsList
              route={activeRoute}
              stops={stops}
              onMove={move}
              onStatus={(stop, status) => statusMut.mutate({ stop, status })}
              onRemove={(id) => removeMut.mutate(id)}
              onAddStop={() => setAddOpen(true)}
              pending={statusMut.isPending}
            />
          </>
        ) : (
          <EmptyState onNewRoute={() => setNewRouteOpen(true)} />
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

        <TechniciansCard technicians={technicians} open={addTechOpen} onOpenChange={setAddTechOpen} />
      </div>

      {/* DESKTOP */}
      <div className="hidden space-y-5 p-5 lg:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--dash-text)]">Route Planner</h1>
            <p className="text-[13px] text-[var(--dash-text-muted-2)]">Manage daily routes and stops</p>
          </div>
          <div className="flex items-center gap-3">
            <DaySelector days={days} dateStr={dateStr} onSelect={setSelectedDate} compact />
            <button onClick={() => setNewRouteOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3.5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> New Route
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-4 rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="min-w-[280px] flex-1">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--dash-text-muted-2)]">Select Technician</h2>
            <TechnicianChips technicians={technicians} techStats={techStats} selectedId={technicianId} focusedId={activeRoute?.technician_id} onSelect={selectTechnician} onAddClick={() => setAddTechOpen(true)} />
          </div>
          <div className="hidden w-px self-stretch bg-[var(--dash-border)] lg:block" />
          <div className="flex flex-wrap items-center gap-6 lg:gap-8">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: `${c.tint}1A`, color: c.tint }}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold leading-tight text-[var(--dash-text)]">{c.value}</div>
                    <div className="whitespace-nowrap text-[11px] font-medium text-[var(--dash-text-muted-2)]">{c.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeRoute ? (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-[var(--dash-text)]">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h2>
                <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-full bg-[var(--dash-navy)] px-3 py-1.5 text-[12px] font-bold text-white">
                  <Plus className="h-3.5 w-3.5" /> Add Stop
                </button>
              </div>

              <StopsList
                route={activeRoute}
                stops={stops}
                onMove={move}
                onStatus={(stop, status) => statusMut.mutate({ stop, status })}
                onRemove={(id) => removeMut.mutate(id)}
                onAddStop={() => setAddOpen(true)}
                pending={statusMut.isPending}
                hideAddCta
              />

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--dash-border)] pt-3 text-[11px] font-medium text-[var(--dash-text-muted-2)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-green)" }} /> Completed</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#2563EB" }} /> In Progress</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-text-muted)" }} /> Pending</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[14px] font-bold text-[var(--dash-text)]">Route Map</h2>
              <RouteMap stops={stops} />
            </div>
          </div>
        ) : (
          <EmptyState onNewRoute={() => setNewRouteOpen(true)} />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {recurringClients.length > 0 && (
            <RecurringSuggestions
              clients={recurringClients}
              technicianId={technicianId}
              technicians={technicians}
              date={dateStr}
              onAdded={(routeId) => { setSelectedRouteId(routeId); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); }}
            />
          )}
          <TechniciansCard technicians={technicians} open={addTechOpen} onOpenChange={setAddTechOpen} />
        </div>
      </div>

      <NewRouteModal
        open={newRouteOpen}
        onClose={() => setNewRouteOpen(false)}
        date={dateStr}
        technicians={technicians}
        onCreated={(routeId) => { setSelectedRouteId(routeId); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); }}
      />
      <AddStopModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        routeId={activeRoute?.id ?? null}
        onAdded={() => { qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] }); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); }}
      />
    </div>
  );
}

function DaySelector({ days, dateStr, onSelect, compact }: { days: Date[]; dateStr: string; onSelect: (d: Date) => void; compact?: boolean }) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto ${compact ? "" : ""}`}>
      {days.map((d) => {
        const active = toDateStr(d) === dateStr;
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-[11px] px-3 py-2 text-xs font-semibold"
            style={{ background: active ? "var(--dash-navy)" : "var(--dash-surface-soft)", color: active ? "#fff" : "var(--dash-text-secondary)" }}
          >
            <span>{WEEKDAY_LONG[d.getDay()]}</span>
            <span className="text-sm">{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ onNewRoute }: { onNewRoute: () => void }) {
  return (
    <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-16 text-center">
      <MapPin className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
      <p className="mt-4 text-sm font-semibold text-[var(--dash-text-secondary)]">No route selected</p>
      <button onClick={onNewRoute} className="mt-3 rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white">
        New Route
      </button>
    </div>
  );
}

function StopsList({
  route, stops, onMove, onStatus, onRemove, onAddStop, pending, hideAddCta,
}: {
  route: RouteRow;
  stops: RouteStop[];
  onMove: (index: number, dir: -1 | 1) => void;
  onStatus: (stop: RouteStop, status: StopStatus) => void;
  onRemove: (id: string) => void;
  onAddStop: () => void;
  pending: boolean;
  hideAddCta?: boolean;
}) {
  const completed = stops.filter((s) => s.status === "Concluído").length;
  return (
    <div className="space-y-3">
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
        {!hideAddCta && (
          <button onClick={onAddStop} className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add Stop
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {stops.map((stop, i) => {
          const next = nextStatus(stop.status);
          return (
            <div key={stop.id} className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4" style={cardShadow}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: statusMarkerColor(stop.status) }}>
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
                  <button onClick={() => onMove(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onMove(i, 1)} disabled={i === stops.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
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
                {stop.client?.address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.client.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--dash-border)]"
                    style={{ color: "var(--dash-navy)" }}
                  >
                    <Navigation className="h-4 w-4" />
                  </a>
                )}
                {next && (
                  <button
                    onClick={() => onStatus(stop, next)}
                    disabled={pending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[10px] py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                  >
                    {next === "Concluído" ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {next === "Concluído" ? "Complete" : "Start"}
                  </button>
                )}
                <button onClick={() => onRemove(stop.id)} className="grid h-9 w-9 place-items-center rounded-[10px] border" style={{ borderColor: "var(--dash-red-border)", color: "var(--dash-red)" }}>
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

function TechniciansCard({ technicians, open, onOpenChange }: { technicians: Technician[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const mut = useMutation({
    mutationFn: () => createTechnician({ name, phone }),
    onSuccess: () => {
      toast.success("Technician added!");
      setName(""); setPhone(""); onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]" style={cardShadow}>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-bold text-[var(--dash-text)]">Technicians</div>
        <button onClick={() => onOpenChange(!open)} className="text-sm font-semibold" style={{ color: "var(--dash-link)" }}>+ Add</button>
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
        <p className="text-sm text-[var(--dash-text-secondary)]">Add a technician first before creating a route.</p>
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

function AddStopModal({ open, onClose, routeId, onAdded }: { open: boolean; onClose: () => void; routeId: string | null; onAdded: () => void }) {
  const [clientId, setClientId] = useState("");
  const [time, setTime] = useState("");
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });

  const mut = useMutation({
    mutationFn: async () => {
      if (!routeId) throw new Error("Select or create a route first");
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
