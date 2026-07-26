import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GoogleMap, Marker, TrafficLayer, useJsApiLoader } from "@react-google-maps/api";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { TechAvatar } from "@/components/TechAvatar";
import {
  Plus, Phone, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, Play, Trash2, MapPin, CalendarDays,
  CheckCircle2, Clock, Share2, LocateFixed, Navigation, FlaskConical, Smartphone, X,
  Timer, Route as RouteIcon, Car, Building2, Home as HomeIcon, RotateCcw, FileText,
} from "lucide-react";
import {
  listTechnicians, createTechnician, listRoutesForDate, getOrCreateRoute, listRouteStops,
  addStopToRoute, updateStopStatus, reorderStops, deleteStop, listClients, clientFullAddress, setClientTechnician,
  formatPhone,
  type RouteStop, type StopStatus, type Technician, type Client, type RouteRow,
} from "@/lib/db";
import { geocodeAndSaveClient } from "@/lib/geocode";
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

// Same visual language as STATUS_STYLES, but for a technician's whole day
// (aggregated across their stops) rather than a single stop.
type RouteStatusLabel = "Pendente" | "Em Rota" | "Concluído";
const ROUTE_STATUS_STYLES: Record<RouteStatusLabel, { bg: string; text: string }> = {
  "Pendente": STATUS_STYLES["Pendente"],
  "Em Rota": STATUS_STYLES["Em serviço"],
  "Concluído": STATUS_STYLES["Concluído"],
};
function routeStatusLabel(total: number, completed: number, inProgress: boolean): RouteStatusLabel {
  if (total > 0 && completed === total) return "Concluído";
  if (completed > 0 || inProgress) return "Em Rota";
  return "Pendente";
}

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

// Local calendar date (YYYY-MM-DD), NOT toISOString() — that converts to UTC,
// which silently rolls the date forward/back a day whenever local time is
// near midnight relative to the UTC offset (e.g. any evening in US Eastern),
// causing stops to land on the wrong weekday.
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function statusMarkerColor(status: StopStatus) {
  if (status === "Concluído") return "#16A34A";
  if (status === "Em serviço") return "#2563EB";
  return "#94A3B8";
}

// Same label the technician sees on their own /tecnico stop cards.
function stopStatusLabel(status: StopStatus) {
  return status === "Em serviço" ? "Em andamento" : status === "Concluído" ? "Concluído" : "Pendente";
}

function isCommercial(clientType: string) {
  return clientType.toLowerCase().startsWith("comm") || clientType.toLowerCase().startsWith("comer");
}

const GOOGLE_MAPS_KEY = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ?? "";
const SARASOTA_CENTER = { lat: 27.3364, lng: -82.5307 };
const mapContainerStyle = { width: "100%", height: "100%" };

type LatLng = { lat: number; lng: number };

// Resolves real map coordinates for a route's stops (from the client record,
// or geocoded on the fly), shared between the map and the summary stats so
// "Distância total" reflects the same positions shown on the map.
function useStopCoords(stops: RouteStop[]) {
  const { isLoaded, loadError } = useJsApiLoader({ id: "sundown-google-maps", googleMapsApiKey: GOOGLE_MAPS_KEY });
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      for (const s of stops) {
        if (!s.client || attempted.current.has(s.id)) continue;
        attempted.current.add(s.id);
        if (s.client.lat != null && s.client.lng != null) {
          setCoords((c) => ({ ...c, [s.id]: { lat: s.client!.lat as number, lng: s.client!.lng as number } }));
          continue;
        }
        const fullAddress = clientFullAddress(s.client);
        if (!fullAddress) continue;
        const result = await geocodeAndSaveClient(s.client.id, fullAddress);
        if (!cancelled && result) setCoords((c) => ({ ...c, [s.id]: result }));
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, stops]);

  return { coords, isLoaded, loadError };
}

function haversineMiles(a: LatLng, b: LatLng) {
  const R = 3958.8;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function RouteMap({
  stops, coords, isLoaded, loadError, showTraffic,
}: { stops: RouteStop[]; coords: Record<string, LatLng>; isLoaded: boolean; loadError?: Error; showTraffic?: boolean }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const points = stops.map((s) => ({ s, pos: coords[s.id] })).filter((p): p is { s: RouteStop; pos: LatLng } => !!p.pos);
  const pathKey = points.map((p) => `${p.pos.lat},${p.pos.lng}`).join("|");

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    if (points.length === 1) {
      mapRef.current.panTo(points[0].pos);
      mapRef.current.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p.pos));
    mapRef.current.fitBounds(bounds, 48);
  }, [points]);

  // Drawn via the raw Maps SDK rather than @react-google-maps/api's
  // <Polyline> — that wrapper has a known crash ("this.get('latLngs')
  // .setAt' — undefined is not an object") when it imperatively patches an
  // existing instance's path on update. Creating/destroying our own
  // instance whenever the path changes avoids that update path entirely.
  useEffect(() => {
    if (!map || points.length < 2) return;
    const polyline = new google.maps.Polyline({
      path: points.map((p) => p.pos),
      strokeColor: "#2563EB",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });
    return () => polyline.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pathKey]);

  function locateMe() {
    if (!navigator.geolocation || !mapRef.current) { toast.error("Location not available"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Couldn't get your location"),
    );
  }

  const wrapperClass = "relative h-56 w-full overflow-hidden rounded-2xl border border-[var(--dash-border)] lg:h-[360px]";

  if (!GOOGLE_MAPS_KEY || loadError) {
    return (
      <div className={`${wrapperClass} grid place-items-center bg-[var(--dash-surface-soft)] text-center`}>
        <div className="px-4">
          <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
          <p className="mt-2 text-sm text-[var(--dash-text-muted)]">Map unavailable — check the Google Maps API key.</p>
          {loadError && <p className="mt-1 break-words text-[11px] text-[var(--dash-text-muted)]">{loadError.message}</p>}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className={`${wrapperClass} animate-pulse bg-[var(--dash-surface-soft)]`} />;
  }

  return (
    <div className={wrapperClass}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={SARASOTA_CENTER}
        zoom={11}
        onLoad={(m) => { mapRef.current = m; setMap(m); }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {showTraffic && <TrafficLayer />}
        {points.map((p, i) => (
          <Marker
            key={p.s.id}
            position={p.pos}
            title={p.s.client?.name}
            label={{ text: String(i + 1), color: "#fff", fontWeight: "bold", fontSize: "12px" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: statusMarkerColor(p.s.status),
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
          />
        ))}
      </GoogleMap>
      <button
        onClick={locateMe}
        className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--dash-navy)] shadow-md"
        title="My location"
      >
        <LocateFixed className="h-4 w-4" />
      </button>
    </div>
  );
}

type StatItem = { icon: typeof MapPin; tint: string; value: string | number; label: string };

function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div className="flex items-stretch rounded-2xl border border-[var(--dash-border)] bg-white p-4">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className={`min-w-0 flex-1 ${i > 0 ? "ml-3 border-l border-[var(--dash-border)] pl-3" : ""}`}>
            <div className="flex items-center gap-1.5">
              <Icon className="h-5 w-5 shrink-0" style={{ color: it.tint }} />
              <span className="text-lg font-extrabold text-[var(--dash-text)]">{it.value}</span>
            </div>
            <div className="mt-1 text-[11px] font-medium leading-tight text-[var(--dash-text-muted-2)]">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

const AVG_MINUTES_PER_STOP = 30;

function routeStats(stops: RouteStop[], coords: Record<string, LatLng>) {
  const completed = stops.filter((s) => s.status === "Concluído").length;
  const remaining = stops.length - completed;
  const timed = stops.filter((s) => s.scheduled_time);
  const finish = timed.length
    ? timed.reduce((max, s) => (s.scheduled_time! > max ? s.scheduled_time! : max), timed[0].scheduled_time!).slice(0, 5)
    : "—";

  const positioned = stops.map((s) => coords[s.id]).filter((p): p is LatLng => !!p);
  let miles = 0;
  for (let i = 1; i < positioned.length; i++) miles += haversineMiles(positioned[i - 1], positioned[i]);
  const distanceLabel = positioned.length > 1 ? `${miles.toFixed(1)} mi` : "—";

  const etaMinutes = remaining * AVG_MINUTES_PER_STOP;
  const etaLabel = etaMinutes === 0 ? "0m" : etaMinutes >= 60 ? `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60 || ""}${etaMinutes % 60 ? "m" : ""}`.trim() : `${etaMinutes}m`;

  return { total: stops.length, completed, remaining, finish, distanceLabel, etaLabel };
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
            <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-10 w-10" textClassName="text-[13px]" />
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
  const [detailStopId, setDetailStopId] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

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
    const map = new Map<string, { total: number; completed: number; inProgress: boolean }>();
    for (const r of routes) {
      const list = r.route_stops ?? [];
      map.set(r.technician_id, {
        total: list.length,
        completed: list.filter((s) => s.status === "Concluído").length,
        inProgress: list.some((s) => s.status === "Em serviço"),
      });
    }
    return map;
  }, [routes]);

  const { coords, isLoaded: mapIsLoaded, loadError: mapLoadError } = useStopCoords(stops);

  // Cards always mirror the route shown below (not an all-technicians total),
  // so the numbers on screen never disagree with the list/map underneath them.
  const summary = routeStats(stops, coords);

  const currentStop = stops.find((s) => s.status === "Em serviço") ?? stops.find((s) => s.status === "Pendente") ?? null;
  const detailStop = stops.find((s) => s.id === detailStopId) ?? currentStop ?? stops[0] ?? null;

  // Clients with an assigned technician are auto-scheduled every matching
  // weekday (see the effect below) — only clients without one still need a
  // manual "who should take this?" suggestion.
  const recurringClients = useMemo(() => {
    const abbr = WEEKDAY_ABBR[selectedDate.getDay()];
    const scheduled = new Set(routes.flatMap((r) => (r.route_stops ?? []).map((s) => s.client_id)));
    return clients.filter((c) => (c.service_days ?? []).includes(abbr) && c.status !== "Inativo" && !c.technician_id && !scheduled.has(c.id));
  }, [clients, routes, selectedDate]);

  // Clients with service_days + a default technician automatically get a
  // stop on that technician's route for every matching weekday, so a
  // recurring Wednesday client shows up every Wednesday without the owner
  // re-adding them by hand each week.
  const autoAttempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (clients.length === 0) return;
    const abbr = WEEKDAY_ABBR[selectedDate.getDay()];
    const scheduled = new Set(routes.flatMap((r) => (r.route_stops ?? []).map((s) => s.client_id)));
    const toSchedule = clients.filter((c) => {
      const key = `${dateStr}:${c.id}`;
      return (
        c.status !== "Inativo" &&
        c.technician_id &&
        (c.service_days ?? []).includes(abbr) &&
        !scheduled.has(c.id) &&
        !autoAttempted.current.has(key)
      );
    });
    if (toSchedule.length === 0) return;
    toSchedule.forEach((c) => autoAttempted.current.add(`${dateStr}:${c.id}`));
    (async () => {
      for (const c of toSchedule) {
        try {
          const route = await getOrCreateRoute(c.technician_id!, dateStr);
          await addStopToRoute(route.id, c.id);
        } catch {
          // best-effort — a failed auto-add just falls back to the manual suggestion next render
        }
      }
      qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] });
    })();
  }, [clients, routes, dateStr, qc]);

  const statusMut = useMutation({
    mutationFn: ({ stop, status }: { stop: RouteStop; status: StopStatus }) => updateStopStatus(stop.id, status, stop.client_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] }); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  function handleStatusChange(stop: RouteStop, status: StopStatus) {
    if (status === "Concluído" && !confirm(`Mark ${stop.client?.name ?? "this stop"}'s visit as completed?`)) return;
    statusMut.mutate({ stop, status });
  }
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

  // Same anchor-on-home-address optimization the technician's own /tecnico
  // "Otimizar" button runs — mirrored here so the owner can trigger it too.
  const optimizeMut = useMutation({
    mutationFn: async () => {
      if (!mapIsLoaded) throw new Error("Mapa ainda carregando, tente novamente em instantes");
      const orderedStops = stops.slice().sort((a, b) => a.position - b.position);
      const withCoords = orderedStops.filter((s) => coords[s.id]);
      const withoutCoords = orderedStops.filter((s) => !coords[s.id]);
      if (withCoords.length < 3) throw new Error("Precisa de pelo menos 3 paradas com endereço para otimizar");

      const directionsService = new google.maps.DirectionsService();
      const home = activeRoute?.technician?.home_lat != null && activeRoute?.technician?.home_lng != null
        ? { lat: activeRoute.technician.home_lat, lng: activeRoute.technician.home_lng }
        : null;

      if (home) {
        const result = await directionsService.route({
          origin: home,
          destination: home,
          waypoints: withCoords.map((s) => ({ location: coords[s.id] })),
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        const order = result.routes[0]?.waypoint_order ?? withCoords.map((_, i) => i);
        const newOrder = [...order.map((i) => withCoords[i]), ...withoutCoords];
        await reorderStops(newOrder.map((s) => s.id));
        return;
      }

      const first = withCoords[0];
      const last = withCoords[withCoords.length - 1];
      const middle = withCoords.slice(1, -1);
      const result = await directionsService.route({
        origin: coords[first.id],
        destination: coords[last.id],
        waypoints: middle.map((s) => ({ location: coords[s.id] })),
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      const order = result.routes[0]?.waypoint_order ?? middle.map((_, i) => i);
      const optimizedMiddle = order.map((i) => middle[i]);
      const newOrder = [first, ...optimizedMiddle, last, ...withoutCoords];
      await reorderStops(newOrder.map((s) => s.id));
    },
    onSuccess: () => {
      toast.success("Rota otimizada!");
      qc.invalidateQueries({ queryKey: ["route-stops", activeRoute?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível otimizar a rota"),
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

  const mobileCards = [
    { icon: MapPin, tint: "#2563EB", value: summary.total, label: "Paradas" },
    { icon: CheckCircle2, tint: "#16A34A", value: summary.completed, label: "Concluídas" },
    { icon: Clock, tint: "#E8813A", value: summary.etaLabel, label: "Tempo" },
    { icon: Share2, tint: "#7C3AED", value: summary.distanceLabel, label: "Distância" },
  ];
  const desktopCards = [
    { icon: MapPin, tint: "#2563EB", value: summary.total, label: "Total Stops" },
    { icon: CheckCircle2, tint: "#16A34A", value: summary.completed, label: "Completed" },
    { icon: Clock, tint: "#E8813A", value: summary.etaLabel, label: "Est. Time Left" },
    { icon: Share2, tint: "#7C3AED", value: summary.distanceLabel, label: "Total Distance" },
  ];

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-20 lg:pb-0 lg:pl-60">
      <AppSidebar />
      <AppHeader />

      {/* MOBILE */}
      <div className="space-y-4 p-3 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--dash-text)]">
              {technicianId === "all" ? "Rotas" : (activeRoute?.technician?.name ?? "Rotas")}
            </h1>
            <p className="text-[13px] text-[var(--dash-text-muted-2)]">
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Hoje <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <MobileDaySelector selected={selectedDate} onSelect={setSelectedDate} />

        {technicianId === "all" ? (
          <>
          <StatRow items={mobileCards} />
          <div className="space-y-2">
            {technicians.length === 0 ? (
              <p className="text-sm text-[var(--dash-text-muted)]">No technicians yet.</p>
            ) : (
              technicians.map((t) => {
                const tStats = techStats.get(t.id) ?? { total: 0, completed: 0, inProgress: false };
                const pct = tStats.total > 0 ? Math.round((tStats.completed / tStats.total) * 100) : 0;
                const label = routeStatusLabel(tStats.total, tStats.completed, tStats.inProgress);
                const badge = ROUTE_STATUS_STYLES[label];
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTechnician(t.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--dash-border)] bg-white p-4 text-left"
                  >
                    <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-10 w-10" textClassName="text-[13px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--dash-text)]">{t.name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badge.bg, color: badge.text }}>
                          {label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-[var(--dash-text-muted-2)]">{tStats.total} paradas · {tStats.completed} concluídas</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--dash-bg)]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--dash-green)" }} />
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">{pct}%</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
                  </button>
                );
              })
            )}
          </div>
          </>
        ) : (
          <>
            <button
              onClick={() => selectTechnician("all")}
              className="flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--dash-link)" }}
            >
              <ChevronLeft className="h-4 w-4" /> Todos os técnicos
            </button>
            {activeRoute ? (
              <TechDayRoute
                route={activeRoute}
                stops={stops}
                summary={summary}
                coords={coords}
                mapIsLoaded={mapIsLoaded}
                mapLoadError={mapLoadError}
                onStatus={handleStatusChange}
                statusPending={statusMut.isPending}
                onOptimize={() => optimizeMut.mutate()}
                optimizePending={optimizeMut.isPending}
                mapSheetOpen={mapSheetOpen}
                onOpenMap={() => setMapSheetOpen(true)}
                onCloseMap={() => setMapSheetOpen(false)}
                showTraffic={showTraffic}
                onToggleTraffic={() => setShowTraffic((v) => !v)}
              />
            ) : (
              <EmptyState onNewRoute={() => setNewRouteOpen(true)} />
            )}
          </>
        )}
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
            <button
              onClick={() => setMobilePreviewOpen(true)}
              title="Preview mobile view"
              className="flex items-center gap-1.5 rounded-[11px] border border-[var(--dash-border)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
            >
              <Smartphone className="h-4 w-4" /> View Mobile
            </button>
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
            {desktopCards.map((c) => {
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
                onStatus={handleStatusChange}
                onRemove={(id) => removeMut.mutate(id)}
                onAddStop={() => setAddOpen(true)}
                pending={statusMut.isPending}
                hideAddCta
                compact
                activeStopId={detailStopId}
                onSelectStop={setDetailStopId}
              />

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--dash-border)] pt-3 text-[11px] font-medium text-[var(--dash-text-muted-2)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-green)" }} /> Completed</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#2563EB" }} /> In Progress</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-text-muted)" }} /> Pending</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[14px] font-bold text-[var(--dash-text)]">Route Map</h2>
              <MapErrorBoundary key={`${activeRoute.id}:${dateStr}`}>
                <RouteMap key={`${activeRoute.id}:${dateStr}`} stops={stops} coords={coords} isLoaded={mapIsLoaded} loadError={mapLoadError} />
              </MapErrorBoundary>
              <CurrentStopPanel stop={detailStop} onViewDetails={() => setDetailStopId(detailStop?.id ?? null)} />
            </div>
          </div>
        ) : (
          <EmptyState onNewRoute={() => setNewRouteOpen(true)} />
        )}

        {activeRoute && <RouteNotesQuickActions stops={stops} onAddStop={() => setAddOpen(true)} />}

        <div className="grid gap-4 lg:grid-cols-2">
          {recurringClients.length > 0 && (
            <RecurringSuggestions
              clients={recurringClients}
              technicianId={technicianId}
              technicians={technicians}
              date={dateStr}
              onAdded={(routeId) => { setSelectedRouteId(routeId); qc.invalidateQueries({ queryKey: ["routes-for-date", dateStr] }); qc.invalidateQueries({ queryKey: ["clients"] }); }}
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
      <MobilePreviewOverlay open={mobilePreviewOpen} onClose={() => setMobilePreviewOpen(false)} />
    </div>
  );
}

function MobilePreviewOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 p-4" onClick={onClose}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Smartphone className="h-4 w-4" /> Mobile preview
      </div>
      <div
        className="relative rounded-[42px] bg-[#111] p-3"
        style={{ boxShadow: "0 30px 90px rgba(0,0,0,.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-1/2 top-3 z-10 h-5 w-28 -translate-x-1/2 rounded-full bg-[#111]" />
        <iframe
          src="/rotas"
          title="Mobile preview"
          className="block rounded-[30px] border-0 bg-white"
          style={{ width: 390, height: 780 }}
        />
      </div>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--dash-text)] hover:opacity-90"
      >
        <X className="h-4 w-4" /> Close
      </button>
    </div>
  );
}

function DaySelector({ days, dateStr, onSelect, compact }: { days: Date[]; dateStr: string; onSelect: (d: Date) => void; compact?: boolean }) {
  const today = toDateStr(new Date());
  const showingToday = days.some((d) => toDateStr(d) === today);

  function shiftWeek(delta: -1 | 1) {
    const next = new Date(days[0]);
    next.setDate(next.getDate() + delta * 7);
    onSelect(next);
  }

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : ""}`}>
      <button
        onClick={() => shiftWeek(-1)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
        title="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex gap-1.5 overflow-x-auto">
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

      <button
        onClick={() => shiftWeek(1)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
        title="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!showingToday && (
        <button
          onClick={() => onSelect(new Date())}
          className="ml-1 shrink-0 rounded-[10px] border border-[var(--dash-border)] px-2.5 py-2 text-xs font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
        >
          Today
        </button>
      )}
    </div>
  );
}

// Wide, horizontally swipeable multi-week strip (mobile). Native touch
// scrolling handles the swipe gesture; no gesture library needed.
const SWIPE_WEEKS_BEFORE = 4;
const SWIPE_WEEKS_AFTER = 4;

function swipeDays(anchor: Date) {
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay() - SWIPE_WEEKS_BEFORE * 7);
  const total = (SWIPE_WEEKS_BEFORE + SWIPE_WEEKS_AFTER + 1) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function MobileDaySelector({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const days = useMemo(() => swipeDays(selected), [selected]);
  const dateStr = toDateStr(selected);
  const today = toDateStr(new Date());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [dateStr]);

  return (
    <div ref={scrollerRef} className="-mx-3 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-3 pb-1">
      {days.map((d) => {
        const ds = toDateStr(d);
        const active = ds === dateStr;
        const isToday = ds === today;
        return (
          <button
            key={ds}
            ref={active ? activeRef : undefined}
            onClick={() => onSelect(d)}
            className="flex w-11 shrink-0 snap-center flex-col items-center gap-1 rounded-xl py-2"
            style={{ background: active ? "var(--dash-navy)" : "transparent", color: active ? "#fff" : "var(--dash-text-secondary-2)" }}
          >
            <span className="text-[11px] font-semibold opacity-80">{WEEKDAY_LONG[d.getDay()]}</span>
            <span className="relative text-[13px] font-bold">
              {d.getDate()}
              {isToday && !active && (
                <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--dash-navy)]" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Mirrors the technician's own /tecnico "Rota" view exactly (same stat
// cards, Ver mapa/Otimizar/Tráfego row, numbered stop cards) so when the
// owner drills into a technician from Rotas, it's the same screen that
// technician sees on their own phone.
function TechDayRoute({
  route, stops, summary, coords, mapIsLoaded, mapLoadError,
  onStatus, statusPending, onOptimize, optimizePending,
  mapSheetOpen, onOpenMap, onCloseMap, showTraffic, onToggleTraffic,
}: {
  route: RouteRow;
  stops: RouteStop[];
  summary: { total: number; completed: number; remaining: number; etaLabel: string };
  coords: Record<string, LatLng>;
  mapIsLoaded: boolean;
  mapLoadError?: Error;
  onStatus: (stop: RouteStop, status: StopStatus) => void;
  statusPending: boolean;
  onOptimize: () => void;
  optimizePending: boolean;
  mapSheetOpen: boolean;
  onOpenMap: () => void;
  onCloseMap: () => void;
  showTraffic: boolean;
  onToggleTraffic: () => void;
}) {
  const statCards = [
    { icon: CheckCircle2, tint: "#16A34A", value: summary.completed, label: "Concluídas" },
    { icon: Timer, tint: "#E8813A", value: summary.remaining, label: "Pendentes" },
    { icon: RouteIcon, tint: "#2563EB", value: summary.total, label: "Total do dia" },
    { icon: Timer, tint: "#7C3AED", value: summary.etaLabel, label: "Tempo estimado" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TechAvatar
          name={route.technician?.name || "?"}
          color={route.technician?.color || "var(--dash-navy)"}
          photoPath={route.technician?.photo_path}
          className="h-11 w-11"
          textClassName="text-sm"
        />
        <div>
          <h2 className="text-lg font-extrabold text-[var(--dash-text)]">{route.technician?.name}</h2>
          <div className="text-xs text-[var(--dash-text-muted)]">
            {stops.length} paradas • <span style={{ color: "var(--dash-green)" }}>{summary.completed} concluídas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-2.5 text-center">
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full" style={{ background: `${c.tint}1A`, color: c.tint }}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-1.5 text-[15px] font-extrabold leading-tight text-[var(--dash-text)]">{c.value}</div>
              <div className="text-[9.5px] font-medium leading-tight text-[var(--dash-text-muted-2)]">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onOpenMap}
          className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)]"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">Ver mapa</span>
        </button>
        <button
          onClick={onOptimize}
          disabled={optimizePending}
          className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)] disabled:opacity-50"
        >
          <RouteIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">{optimizePending ? "Otimizando..." : "Otimizar"}</span>
        </button>
        <button
          onClick={() => { onToggleTraffic(); onOpenMap(); }}
          className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)]"
        >
          <Car className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">Tráfego</span>
        </button>
      </div>

      {mapSheetOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={onCloseMap} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
            <div className="relative pt-2.5">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
              <button onClick={onCloseMap} className="absolute right-4 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 pb-6 pt-2">
              <div>
                <div className="text-lg font-extrabold text-[var(--dash-text)]">Mapa da rota</div>
                <p className="text-[13px] text-[var(--dash-text-muted)]">{route.technician?.name}</p>
              </div>
              <MapErrorBoundary key={route.id}>
                <RouteMap stops={stops} coords={coords} isLoaded={mapIsLoaded} loadError={mapLoadError} showTraffic={showTraffic} />
              </MapErrorBoundary>
            </div>
          </div>
        </>
      )}

      <div className="space-y-0">
        {stops.length === 0 ? (
          <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
            <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhuma parada neste dia</p>
          </div>
        ) : (
          stops.map((stop, i) => {
            const badgeStyle = STATUS_STYLES[stop.status] ?? STATUS_STYLES["Pendente"];
            const next = nextStatus(stop.status);
            const address = stop.client ? clientFullAddress(stop.client) : "";
            const commercial = isCommercial(stop.client?.client_type ?? "");
            return (
              <div key={stop.id} className="relative mb-3">
                <div
                  className="absolute -left-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white"
                  style={{ background: statusMarkerColor(stop.status) }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 rounded-[14px] border border-[var(--dash-border)] bg-white p-3 pl-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">{stop.client?.name}</div>
                      {address ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[12px] text-[var(--dash-text-muted-2)] underline decoration-dotted underline-offset-2"
                        >
                          {address}
                        </a>
                      ) : (
                        <span className="text-[12px] text-[var(--dash-text-muted-2)]">—</span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badgeStyle.bg, color: badgeStyle.text }}>
                          {stopStatusLabel(stop.status)}
                        </span>
                        {stop.status === "Concluído" && (
                          <button
                            onClick={() => { if (confirm(`Voltar a parada de ${stop.client?.name ?? "cliente"} para Pendente?`)) onStatus(stop, "Pendente"); }}
                            title="Desfazer conclusão"
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[var(--dash-text-muted-2)]"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</div>
                    </div>
                  </div>

                  {stop.notes && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-[#FEF3C7] px-2.5 py-1.5 text-[12px] text-[#92400E]">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {stop.notes}
                    </div>
                  )}

                  <div className="mt-2 flex flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span
                      title={commercial ? "Comercial" : "Residencial"}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                      style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                    >
                      {commercial ? <Building2 className="h-3.5 w-3.5" /> : <HomeIcon className="h-3.5 w-3.5" />}
                    </span>
                    <Link
                      to="/chemicals/$stopId"
                      params={{ stopId: stop.id }}
                      title="Chemical"
                      className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-bold text-white"
                      style={{ background: "var(--dash-green)" }}
                    >
                      <FlaskConical className="h-3 w-3" />
                      Chemical
                    </Link>
                    {stop.client?.phone && (
                      <a href={`tel:${stop.client.phone}`} title={formatPhone(stop.client.phone)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Navigate"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {next && (
                      <button
                        onClick={() => onStatus(stop, next)}
                        disabled={statusPending}
                        className="flex shrink-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                        style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                      >
                        {next === "Concluído" ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {next === "Concluído" ? "Concluir" : "Iniciar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
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
  route, stops, onMove, onStatus, onRemove, onAddStop, pending, hideAddCta, showDelete = true,
  compact = false, activeStopId, onSelectStop,
}: {
  route: RouteRow;
  stops: RouteStop[];
  onMove: (index: number, dir: -1 | 1) => void;
  onStatus: (stop: RouteStop, status: StopStatus) => void;
  onRemove: (id: string) => void;
  onAddStop: () => void;
  pending: boolean;
  hideAddCta?: boolean;
  showDelete?: boolean;
  compact?: boolean;
  activeStopId?: string | null;
  onSelectStop?: (id: string) => void;
}) {
  const completed = stops.filter((s) => s.status === "Concluído").length;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!compact || !activeStopId) return;
    setExpandedId(activeStopId);
    rowRefs.current[activeStopId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [compact, activeStopId]);

  function toggle(stop: RouteStop) {
    const next = expandedId === stop.id ? null : stop.id;
    setExpandedId(next);
    if (next) onSelectStop?.(stop.id);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TechAvatar
            name={route.technician?.name || "?"}
            color={route.technician?.color || "var(--dash-navy)"}
            photoPath={route.technician?.photo_path}
            className="h-11 w-11"
            textClassName="text-sm"
          />
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
          const isExpanded = !compact || expandedId === stop.id;
          return (
            <div
              key={stop.id}
              ref={(el) => { rowRefs.current[stop.id] = el; }}
              className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4"
              style={cardShadow}
            >
              <div
                className={`flex items-start gap-3 ${compact ? "cursor-pointer" : ""}`}
                onClick={compact ? () => toggle(stop) : undefined}
              >
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: statusMarkerColor(stop.status) }}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[var(--dash-text)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</div>
                    <StatusBadge status={stop.status} />
                  </div>
                  <Link to="/clientes" onClick={(e) => e.stopPropagation()} className="mt-1 block truncate font-semibold text-[var(--dash-text)] hover:underline">
                    {stop.client?.name}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {compact && (
                      <Link to="/chemicals/$stopId" params={{ stopId: stop.id }} onClick={(e) => e.stopPropagation()} className="shrink-0" title="Pool Chemicals">
                        <FlaskConical className="h-3.5 w-3.5" style={{ color: "var(--dash-green)" }} />
                      </Link>
                    )}
                    <div className="truncate text-xs text-[var(--dash-text-muted)]">{stop.client?.address}</div>
                  </div>
                </div>
                {compact ? (
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[var(--dash-text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                ) : (
                  <div className="flex shrink-0 flex-col gap-1">
                    <button onClick={() => onMove(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onMove(i, 1)} disabled={i === stops.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="mt-3 flex items-center gap-2">
                  {compact && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => onMove(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onMove(i, 1)} disabled={i === stops.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {stop.client?.phone && (
                    <a href={`tel:${stop.client.phone}`} className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--dash-border)]" style={{ color: "var(--dash-navy)" }}>
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {stop.client?.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clientFullAddress(stop.client))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--dash-border)]"
                      style={{ color: "var(--dash-navy)" }}
                    >
                      <Navigation className="h-4 w-4" />
                    </a>
                  )}
                  <Link
                    to="/chemicals/$stopId"
                    params={{ stopId: stop.id }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-sm font-semibold"
                    style={{ background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                  >
                    <FlaskConical className="h-4 w-4" /> Chemicals
                  </Link>
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
                  {showDelete && (
                    <button onClick={() => onRemove(stop.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border" style={{ borderColor: "var(--dash-red-border)", color: "var(--dash-red)" }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
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

function CurrentStopPanel({ stop, onViewDetails }: { stop: RouteStop | null; onViewDetails: () => void }) {
  if (!stop) {
    return (
      <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4 text-center text-sm text-[var(--dash-text-muted)]">
        No stop selected.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: statusMarkerColor(stop.status) }}>
          {stop.position + 1}
        </span>
        <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--dash-text-muted-2)]">Current Stop</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{stop.client?.name}</div>
          <div className="text-[13px] text-[var(--dash-text-secondary-2)]">{stop.client?.address}</div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-[11px] font-semibold text-[var(--dash-text-muted-2)]">Service Type</div>
            <div className="text-[13px] font-bold text-[var(--dash-text)]">{stop.client?.service_frequency || "Standard Service"}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--dash-text-muted-2)]">Est. Duration</div>
            <div className="text-[13px] font-bold text-[var(--dash-text)]">~{AVG_MINUTES_PER_STOP} min</div>
          </div>
          <button onClick={onViewDetails} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: "var(--dash-navy)" }}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteNotesQuickActions({ stops, onAddStop }: { stops: RouteStop[]; onAddStop: () => void }) {
  const notes = stops.filter((s) => s.notes).map((s) => s.notes as string);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Route Notes</h3>
        {notes.length > 0 ? (
          <ul className="space-y-1.5">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--dash-text-secondary)]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--dash-text-muted)]" />
                {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[var(--dash-text-muted)]">No notes on this route's stops yet.</p>
        )}
      </div>
      <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onAddStop} className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--dash-border)] px-2 py-3 text-center text-[11px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
            <Plus className="h-4 w-4" /> Add Stop
          </button>
          <button
            onClick={() => toast.info("Expand a stop below to move it up or down")}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--dash-border)] px-2 py-3 text-center text-[11px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
          >
            <ChevronUp className="h-4 w-4" /> Reorder Stops
          </button>
          <button
            onClick={() => toast.info("Send to Technician — coming soon")}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--dash-border)] px-2 py-3 text-center text-[11px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
          >
            <Navigation className="h-4 w-4" /> Send to Technician
          </button>
        </div>
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
      await setClientTechnician(client.id, techId);
      return route.id;
    },
    onSuccess: (routeId, { client }) => {
      toast.success(`${client.name} added — they'll now auto-schedule every matching weekday`);
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
        Scheduled for this weekday but have no assigned technician yet — set one on the client's profile to auto-schedule them every week.
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
            <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-8 w-8" textClassName="text-xs" />
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
      await addStopToRoute(routeId, clientId, time || undefined, undefined, true);
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
