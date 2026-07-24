import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GoogleMap, Marker, TrafficLayer, useJsApiLoader } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo } from "@/components/AppLogo";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { TecnicoClientDetail } from "@/components/TecnicoClientDetail";
import { Modal } from "@/components/Modal";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import {
  CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Phone, Navigation, Play, Check, FlaskConical, LogOut, MapPin, Mail,
  CheckCircle2, Timer, Route as RouteIcon, Car, Home, Building2, MoreHorizontal, Users, Wrench, Menu, Plus,
  AlertTriangle, DollarSign, Filter, FileText, X, RotateCcw,
} from "lucide-react";
import {
  getMyTechnician, getMyTechnicianStops, ensureMyTechnicianStops, updateMyStopStatus, getMyTechnicianClients,
  getMyTechnicianDashboard, getMyTechnicianAlerts, reorderStops, updateMyTechnicianProfile,
  getMyServiceJobs, createMyServiceJob, completeMyServiceJob,
  initials, fmt, fmtDate, type StopStatus, type TechnicianStop, type TechnicianClient, type TechnicianDashboardStats, type TechnicianAlert,
  type ServiceJob,
} from "@/lib/db";
import { formatPhone } from "@/lib/pdf";
import { toast } from "sonner";
import tecnicoIcon from "@/assets/tecnico-apple-touch-icon.png";

export const Route = createFileRoute("/tecnico")({
  validateSearch: (search: Record<string, unknown>): { view?: "inicio" | "rota" | "clientes" | "servicos" } => ({
    view: search.view === "rota" || search.view === "clientes" || search.view === "servicos" ? search.view : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Route - Sundown" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-title", content: "Route - Sundown" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "apple-touch-icon", href: tecnicoIcon },
      { rel: "icon", href: tecnicoIcon },
    ],
  }),
  component: TecnicoPage,
});

const STATUS_STYLES: Record<StopStatus, { bg: string; text: string }> = {
  "Pendente": { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" },
  "Em serviço": { bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" },
  "Concluído": { bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" },
};

function statusMarkerColor(status: StopStatus) {
  if (status === "Concluído") return "#16A34A";
  if (status === "Em serviço") return "#2563EB";
  return "#94A3B8";
}

function nextStatus(status: StopStatus): StopStatus | null {
  if (status === "Pendente") return "Em serviço";
  if (status === "Em serviço") return "Concluído";
  return null;
}

function stopStatusLabel(status: StopStatus) {
  return status === "Em serviço" ? "Em andamento" : status === "Concluído" ? "Concluído" : "Pendente";
}

// Local calendar date (YYYY-MM-DD), NOT toISOString() — see rotas.tsx.
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function stopAddress(stop: TechnicianStop) {
  return [stop.client_address, stop.client_city, stop.client_state, stop.client_zip].filter(Boolean).join(", ");
}

function isCommercial(clientType: string) {
  return clientType.toLowerCase().startsWith("comm") || clientType.toLowerCase().startsWith("comer");
}

const GOOGLE_MAPS_KEY = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ?? "";
const SARASOTA_CENTER = { lat: 27.3364, lng: -82.5307 };
const mapContainerStyle = { width: "100%", height: "100%" };
const AVG_MINUTES_PER_STOP = 30;
// Stable array reference — @react-google-maps/api warns and reloads the
// script if a new array literal is passed on every render, and both
// useJsApiLoader calls below share the "sundown-google-maps" id so their
// options must match exactly (places is needed for the profile's home
// address autocomplete).
const MAP_LIBRARIES: ("places")[] = ["places"];

// Classic teardrop pin, traced in a 24x24 box (point at the bottom, so the
// marker's anchor sits exactly where the address is).
const PIN_PATH = "M 12 0 C 7.03 0 3 4.03 3 9 c 0 6.75 9 15 9 15 s 9 -8.25 9 -15 c 0 -4.97 -4.03 -9 -9 -9 Z";

type LatLng = { lat: number; lng: number };

function TecnicoRouteMap({ stops, showTraffic, onToggleTraffic }: { stops: TechnicianStop[]; showTraffic: boolean; onToggleTraffic: () => void }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: "sundown-google-maps", googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: MAP_LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("hybrid");
  const points = stops
    .map((s) => ({ s, pos: (s.client_lat != null && s.client_lng != null ? { lat: s.client_lat, lng: s.client_lng } : null) as LatLng | null }))
    .filter((p): p is { s: TechnicianStop; pos: LatLng } => !!p.pos);

  function switchMapType(type: "roadmap" | "hybrid") {
    setMapType(type);
    mapRef.current?.setMapTypeId(type);
  }

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

  const wrapperClass = "relative h-[58vh] w-full overflow-hidden rounded-2xl border border-[var(--dash-border)]";

  if (!GOOGLE_MAPS_KEY || loadError) {
    return (
      <div className={`${wrapperClass} grid place-items-center bg-[var(--dash-surface-soft)] text-center`}>
        <div className="px-4">
          <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
          <p className="mt-2 text-sm text-[var(--dash-text-muted)]">Mapa indisponível.</p>
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
        onLoad={(m) => { mapRef.current = m; }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: false,
          fullscreenControl: false,
          mapTypeId: mapType,
        }}
      >
        {showTraffic && <TrafficLayer />}
        {points.map((p) => (
          <Marker
            key={p.s.stop_id}
            position={p.pos}
            title={p.s.client_name}
            label={{ text: String(stops.findIndex((s) => s.stop_id === p.s.stop_id) + 1), color: "#fff", fontWeight: "bold", fontSize: "12px" }}
            icon={{
              path: PIN_PATH,
              scale: 1.5,
              fillColor: statusMarkerColor(p.s.status),
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 1.5,
              anchor: new google.maps.Point(12, 24),
              labelOrigin: new google.maps.Point(12, 9),
            }}
          />
        ))}
      </GoogleMap>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTraffic}
          className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-md"
          style={{ color: showTraffic ? "#2563EB" : "var(--dash-text-muted)" }}
          aria-label="Alternar tráfego"
        >
          <Car className="h-4 w-4" />
        </button>
        <div className="flex overflow-hidden rounded-full bg-white text-[13px] font-bold shadow-md">
          <button
            type="button"
            onClick={() => switchMapType("roadmap")}
            className="px-3.5 py-1.5"
            style={{ color: mapType === "roadmap" ? "#2563EB" : "var(--dash-text-muted)" }}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => switchMapType("hybrid")}
            className="px-3.5 py-1.5"
            style={{ color: mapType === "hybrid" ? "#2563EB" : "var(--dash-text-muted)" }}
          >
            Satélite
          </button>
        </div>
      </div>
    </div>
  );
}

function TecnicoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [checkedSession, setCheckedSession] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const dateStr = toDateStr(date);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const handleDateSwipeStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };
  const handleDateSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      setDate((d) => new Date(d.getTime() + 86400000));
    } else {
      setDate((d) => new Date(d.getTime() - 86400000));
    }
  };
  const [view, setView] = useState<"inicio" | "rota" | "clientes" | "servicos">(search.view ?? "inicio");
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [newJobClientId, setNewJobClientId] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobNotes, setNewJobNotes] = useState("");
  const [selectedJob, setSelectedJob] = useState<ServiceJob | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [selectedClient, setSelectedClient] = useState<TechnicianClient | null>(null);
  const [undoStop, setUndoStop] = useState<TechnicianStop | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [myEmail, setMyEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileHomeAddress, setProfileHomeAddress] = useState("");
  const [profileHomeLat, setProfileHomeLat] = useState<number | null>(null);
  const [profileHomeLng, setProfileHomeLng] = useState<number | null>(null);
  const { isLoaded: mapsLoaded } = useJsApiLoader({ id: "sundown-google-maps", googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: MAP_LIBRARIES });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setMyEmail(data.user.email ?? "");
      const technician = await getMyTechnician();
      if (!technician) {
        navigate({ to: "/invoice" });
        return;
      }
      setCheckedSession(true);
    })();
  }, [navigate]);

  const { data: technician } = useQuery({ queryKey: ["my-technician"], queryFn: getMyTechnician, enabled: checkedSession });
  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["my-technician-stops", dateStr],
    queryFn: async () => {
      await ensureMyTechnicianStops(dateStr);
      return getMyTechnicianStops(dateStr);
    },
    enabled: checkedSession,
  });
  const { data: myClients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["my-technician-clients"],
    queryFn: getMyTechnicianClients,
    enabled: checkedSession,
  });
  const { data: dashboard, isLoading: isLoadingDashboard, error: dashboardError } = useQuery({
    queryKey: ["my-technician-dashboard", dateStr],
    queryFn: () => getMyTechnicianDashboard(dateStr),
    enabled: checkedSession,
  });
  const { data: alerts = [], isLoading: isLoadingAlerts, error: alertsError } = useQuery({
    queryKey: ["my-technician-alerts", dateStr],
    queryFn: () => getMyTechnicianAlerts(dateStr),
    enabled: checkedSession,
  });
  useEffect(() => {
    if (dashboardError) console.error("get_my_technician_dashboard failed", dashboardError);
    if (alertsError) console.error("get_my_technician_alerts failed", alertsError);
  }, [dashboardError, alertsError]);

  const { data: serviceJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["my-service-jobs"],
    queryFn: () => getMyServiceJobs(),
    enabled: checkedSession,
  });

  const createJobMut = useMutation({
    mutationFn: () => createMyServiceJob(newJobClientId, newJobTitle.trim(), newJobNotes.trim() || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-jobs"] });
      setNewJobOpen(false);
      setNewJobClientId("");
      setNewJobTitle("");
      setNewJobNotes("");
      toast.success("Serviço criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeJobMut = useMutation({
    mutationFn: (jobId: string) => completeMyServiceJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-jobs"] });
      setSelectedJob(null);
      toast.success("Serviço concluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ stopId, status }: { stopId: string; status: StopStatus }) => updateMyStopStatus(stopId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-technician-stops", dateStr] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // When the technician has a home address on file, anchor the whole day
  // there (origin = destination = home) so Directions' optimizer picks
  // whichever shape is actually shortest — start close to home and finish
  // far, or start far and finish close to home — instead of ignoring where
  // the route begins and ends. Without a home address, fall back to
  // anchoring on the current first/last stop as before.
  const optimizeMut = useMutation({
    mutationFn: async () => {
      if (!mapsLoaded) throw new Error("Mapa ainda carregando, tente novamente em instantes");
      const orderedStops = stops.slice().sort((a, b) => a.position - b.position);
      const withCoords = orderedStops.filter((s) => s.client_lat != null && s.client_lng != null);
      const withoutCoords = orderedStops.filter((s) => s.client_lat == null || s.client_lng == null);
      if (withCoords.length < 3) throw new Error("Precisa de pelo menos 3 paradas com endereço para otimizar");

      const directionsService = new google.maps.DirectionsService();
      const home = technician?.home_lat != null && technician?.home_lng != null
        ? { lat: technician.home_lat, lng: technician.home_lng }
        : null;

      if (home) {
        const result = await directionsService.route({
          origin: home,
          destination: home,
          waypoints: withCoords.map((s) => ({ location: { lat: s.client_lat!, lng: s.client_lng! } })),
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        const order = result.routes[0]?.waypoint_order ?? withCoords.map((_, i) => i);
        const newOrder = [...order.map((i) => withCoords[i]), ...withoutCoords];
        await reorderStops(newOrder.map((s) => s.stop_id));
        return;
      }

      const first = withCoords[0];
      const last = withCoords[withCoords.length - 1];
      const middle = withCoords.slice(1, -1);
      const result = await directionsService.route({
        origin: { lat: first.client_lat!, lng: first.client_lng! },
        destination: { lat: last.client_lat!, lng: last.client_lng! },
        waypoints: middle.map((s) => ({ location: { lat: s.client_lat!, lng: s.client_lng! } })),
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const order = result.routes[0]?.waypoint_order ?? middle.map((_, i) => i);
      const optimizedMiddle = order.map((i) => middle[i]);
      const newOrder = [first, ...optimizedMiddle, last, ...withoutCoords];
      await reorderStops(newOrder.map((s) => s.stop_id));
    },
    onSuccess: () => {
      toast.success("Rota otimizada!");
      qc.invalidateQueries({ queryKey: ["my-technician-stops", dateStr] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível otimizar a rota"),
  });

  const updateProfileMut = useMutation({
    mutationFn: () => updateMyTechnicianProfile({
      phone: profilePhone.trim() || null,
      home_address: profileHomeAddress.trim() || null,
      home_lat: profileHomeLat,
      home_lng: profileHomeLng,
    }),
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["my-technician"] });
      setProfileOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openProfile() {
    setProfilePhone(technician?.phone ?? "");
    setProfileHomeAddress(technician?.home_address ?? "");
    setProfileHomeLat(technician?.home_lat ?? null);
    setProfileHomeLng(technician?.home_lng ?? null);
    setProfileOpen(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function finalizeRoute() {
    const pending = sorted.filter((s) => s.status !== "Concluído").length;
    if (pending > 0) {
      toast.error(`Ainda há ${pending} parada${pending > 1 ? "s" : ""} pendente${pending > 1 ? "s" : ""}.`);
      return;
    }
    toast.success("Rota do dia finalizada!");
  }

  function comingSoon(label: string) {
    toast.info(`${label} — em breve`);
  }

  if (!checkedSession) return null;

  const sorted = stops.slice().sort((a, b) => a.position - b.position);
  const completedCount = sorted.filter((s) => s.status === "Concluído").length;
  const pendingCount = sorted.filter((s) => s.status !== "Concluído").length;
  const etaMinutes = pendingCount * AVG_MINUTES_PER_STOP;
  const etaLabel = etaMinutes >= 60 ? `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m` : `${etaMinutes}m`;
  const dateLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const statCards = [
    { icon: CheckCircle2, tint: "#16A34A", value: completedCount, label: "Concluídas" },
    { icon: Timer, tint: "#E8813A", value: pendingCount, label: "Pendentes" },
    { icon: RouteIcon, tint: "#2563EB", value: sorted.length, label: "Total do dia" },
    { icon: Timer, tint: "#7C3AED", value: etaLabel, label: "Tempo estimado" },
  ];

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-24">
      <header className="flex items-center justify-between border-b border-[var(--dash-border)] bg-white px-4 py-3">
        <button onClick={() => setView("inicio")}>
          <AppLogo style={{ width: 124, height: 32 }} />
        </button>
        <div className="flex items-center gap-2.5">
          <button onClick={openProfile} className="flex items-center gap-2.5">
            <div className="text-right leading-tight">
              <div className="text-[13px] font-bold text-[var(--dash-text)]">{technician?.name}</div>
              <div className="text-[11px] text-[var(--dash-text-muted)]">Pool Technician</div>
            </div>
            <div className="relative">
              <div
                className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ background: technician?.color || "var(--dash-navy)" }}
              >
                {technician ? initials(technician.name) : ""}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--dash-green)]" />
            </div>
          </button>
          <button onClick={signOut} title="Sair" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {view === "inicio" ? (
          <TecnicoHomeDashboard
            date={date}
            stats={dashboard ?? null}
            alerts={alerts}
            isLoading={isLoadingDashboard || isLoadingAlerts}
            error={dashboardError ?? alertsError ?? null}
            onJumpToday={() => setDate(new Date())}
          />
        ) : view === "clientes" ? (
          <TecnicoClientsList clients={myClients} isLoading={isLoadingClients} onSelectClient={setSelectedClient} />
        ) : view === "servicos" ? (
          <TecnicoServicesList
            jobs={serviceJobs}
            isLoading={isLoadingJobs}
            onSelectJob={setSelectedJob}
            onNewJob={() => setNewJobOpen(true)}
          />
        ) : (
          <>
        <div
          className="flex items-center justify-between rounded-[14px] border border-[var(--dash-border)] bg-white p-3"
          onTouchStart={handleDateSwipeStart}
          onTouchEnd={handleDateSwipeEnd}
        >
          <button onClick={() => setDate((d) => new Date(d.getTime() - 86400000))} className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-[13px] font-bold capitalize text-[var(--dash-text)]">
              <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--dash-navy)" }} /> {dateLabel}
            </div>
            <div className="text-[11px] text-[var(--dash-text-muted)]">{completedCount} de {sorted.length} concluídas</div>
          </div>
          <button onClick={() => setDate((d) => new Date(d.getTime() + 86400000))} className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
            <ChevronRight className="h-4 w-4" />
          </button>
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
            onClick={() => setMapOpen(true)}
            className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)]"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">Ver mapa</span>
          </button>
          <button
            onClick={() => optimizeMut.mutate()}
            disabled={optimizeMut.isPending}
            className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)] disabled:opacity-50"
          >
            <RouteIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">{optimizeMut.isPending ? "Otimizando..." : "Otimizar"}</span>
          </button>
          <button
            onClick={() => { setShowTraffic((v) => !v); setMapOpen(true); }}
            className="flex items-center justify-center gap-1 rounded-full border border-[var(--dash-border)] bg-white px-1.5 py-2 text-[11px] font-bold text-[var(--dash-text-secondary)]"
          >
            <Car className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">Tráfego</span>
          </button>
        </div>

        {mapOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMapOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
              <div className="relative pt-2.5">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
                <button onClick={() => setMapOpen(false)} className="absolute right-4 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 px-5 pb-6 pt-3">
                <div>
                  <div className="text-xl font-extrabold text-[var(--dash-text)]">Mapa da rota</div>
                  <p className="text-[13px] text-[var(--dash-text-muted)]">Visualize o percurso e as paradas do dia.</p>
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

                <MapErrorBoundary key={dateStr}>
                  <TecnicoRouteMap key={dateStr} stops={sorted} showTraffic={showTraffic} onToggleTraffic={() => setShowTraffic((v) => !v)} />
                </MapErrorBoundary>

                <button
                  onClick={() => {
                    const next = sorted.find((s) => s.status !== "Concluído");
                    if (!next) { toast.success("Todas as paradas concluídas!"); return; }
                    const address = stopAddress(next);
                    if (!address) { toast.info("Sem endereço para essa parada"); return; }
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#2563EB" }}
                >
                  <Navigation className="h-4 w-4" /> Iniciar rota
                </button>
              </div>
            </div>
          </>
        )}

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setProfileOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
              <div className="relative pt-2.5">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
                <button onClick={() => setProfileOpen(false)} className="absolute right-4 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 px-5 pb-6 pt-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
                    style={{ background: technician?.color || "var(--dash-navy)" }}
                  >
                    {technician ? initials(technician.name) : ""}
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[var(--dash-text)]">{technician?.name}</div>
                    <p className="text-[13px] text-[var(--dash-text-muted)]">Meu perfil</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0" style={{ color: "var(--dash-navy)" }} />
                  <span className="truncate text-sm text-[var(--dash-text-secondary)]">{myEmail || "—"}</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Telefone</label>
                  <input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <AddressAutocomplete
                    value={profileHomeAddress}
                    onChange={setProfileHomeAddress}
                    onSelectPlace={(p) => {
                      setProfileHomeAddress([p.address, p.city, p.state, p.zip].filter(Boolean).join(", "));
                      setProfileHomeLat(p.lat ?? null);
                      setProfileHomeLng(p.lng ?? null);
                    }}
                    label="Endereço de casa"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--dash-text-muted)]">
                    Usado para otimizar a rota a partir de onde você sai e volta.
                  </p>
                </div>

                <button
                  onClick={() => updateProfileMut.mutate()}
                  disabled={updateProfileMut.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--dash-navy)" }}
                >
                  {updateProfileMut.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="space-y-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>
          ) : sorted.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
              <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhuma parada neste dia</p>
            </div>
          ) : (
            sorted.map((stop, i) => {
              const badgeStyle = STATUS_STYLES[stop.status] ?? STATUS_STYLES["Pendente"];
              const next = nextStatus(stop.status);
              const address = stopAddress(stop);
              const commercial = isCommercial(stop.client_type);
              return (
                <div key={stop.stop_id} className="relative mb-3">
                  <div
                    className="absolute -left-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white"
                    style={{ background: statusMarkerColor(stop.status) }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 rounded-[14px] border border-[var(--dash-border)] bg-white p-3 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">{stop.client_name}</div>
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
                              onClick={() => setUndoStop(stop)}
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

                    {stop.stop_notes && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-[#FEF3C7] px-2.5 py-1.5 text-[12px] text-[#92400E]">
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {stop.stop_notes}
                      </div>
                    )}

                    <div className="mt-2 flex flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <span
                        title={commercial ? "Comercial" : "Residencial"}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                        style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                      >
                        {commercial ? <Building2 className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                      </span>
                      <Link
                        to="/tecnico/chemicals/$stopId"
                        params={{ stopId: stop.stop_id }}
                        title="Chemical"
                        className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-bold text-white"
                        style={{ background: "var(--dash-green)" }}
                      >
                        <FlaskConical className="h-3 w-3" />
                        Chemical
                      </Link>
                      {stop.client_phone && (
                        <a href={`tel:${stop.client_phone}`} title={formatPhone(stop.client_phone)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
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
                          onClick={() => statusMut.mutate({ stopId: stop.stop_id, status: next })}
                          disabled={statusMut.isPending}
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

        {sorted.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={finalizeRoute}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[var(--dash-navy)] py-3 text-sm font-bold text-white"
            >
              <Check className="h-4 w-4" /> Finalizar Rota do Dia
            </button>
            <button
              onClick={() => comingSoon("Mais opções")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
          </>
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--dash-border)] bg-white px-2 py-2 [-webkit-transform:translateZ(0)] [transform:translateZ(0)]"
        style={{ willChange: "transform" }}
      >
        <button
          onClick={() => setView("rota")}
          className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-bold"
          style={{ color: view === "rota" ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <RouteIcon className="h-5 w-5" />
          Rota
        </button>
        <button
          onClick={() => setView("clientes")}
          className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-bold"
          style={{ color: view === "clientes" ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <Users className="h-5 w-5" />
          Clientes
        </button>
        <button
          onClick={() => comingSoon("Adicionar")}
          className="-mt-6 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg"
          style={{ background: "var(--dash-navy)" }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => setView("servicos")}
          className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-bold"
          style={{ color: view === "servicos" ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <Wrench className="h-5 w-5" />
          Serviços
        </button>
        <button onClick={() => comingSoon("Mais")} className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-medium text-[var(--dash-text-muted-2)]">
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>

      {selectedClient && (
        <TecnicoClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          todayStopId={sorted.find((s) => s.client_id === selectedClient.client_id)?.stop_id ?? null}
          onCompleteService={() => {
            const stop = sorted.find((s) => s.client_id === selectedClient.client_id);
            if (stop) statusMut.mutate({ stopId: stop.stop_id, status: "Concluído" });
          }}
        />
      )}


      {undoStop && (
        <Modal
          open
          onClose={() => setUndoStop(null)}
          title="Desfazer conclusão"
          maxWidth="max-w-sm"
        >
          <p className="text-sm text-[var(--dash-text-secondary)]">
            Voltar o serviço em <span className="font-bold text-[var(--dash-text)]">{undoStop.client_name}</span> para Pendente?
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setUndoStop(null)}
              className="flex-1 rounded-[12px] border border-[var(--dash-border)] py-2.5 text-sm font-bold text-[var(--dash-text-secondary)]"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                statusMut.mutate({ stopId: undoStop.stop_id, status: "Pendente" });
                setUndoStop(null);
              }}
              className="flex-1 rounded-[12px] py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--dash-navy)" }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {newJobOpen && (
        <Modal open onClose={() => setNewJobOpen(false)} title="Novo serviço" maxWidth="max-w-md">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Cliente</label>
              <select
                value={newJobClientId}
                onChange={(e) => setNewJobClientId(e.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione um cliente</option>
                {myClients
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.client_id} value={c.client_id}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">O que precisa ser feito</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SERVICE_JOB_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewJobTitle(s)}
                    className="rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                    style={
                      newJobTitle === s
                        ? { borderColor: "var(--dash-navy)", background: "var(--dash-navy)", color: "#fff" }
                        : { borderColor: "var(--dash-border)", color: "var(--dash-text-secondary)" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="Ex: Troca de filtro"
                className="mt-2 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Notas (opcional)</label>
              <textarea
                value={newJobNotes}
                onChange={(e) => setNewJobNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={() => createJobMut.mutate()}
              disabled={!newJobClientId || !newJobTitle.trim() || createJobMut.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
              style={{ background: "var(--dash-navy)" }}
            >
              {createJobMut.isPending ? "Criando..." : "Criar serviço"}
            </button>
          </div>
        </Modal>
      )}

      {selectedJob && (
        <Modal open onClose={() => setSelectedJob(null)} title="Detalhes do serviço" maxWidth="max-w-md">
          <div className="space-y-3">
            <div>
              <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{selectedJob.title}</div>
              <div className="text-[13px] text-[var(--dash-text-muted)]">{selectedJob.client_name}</div>
            </div>

            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={
                selectedJob.status === "Concluído"
                  ? { background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" }
                  : { background: "var(--dash-badge-sent-bg)", color: "var(--dash-badge-sent-text)" }
              }
            >
              {selectedJob.status}
            </span>

            {selectedJob.notes && (
              <div className="flex items-start gap-1.5 rounded-[10px] bg-[var(--dash-bg)] px-2.5 py-2 text-[12.5px] text-[var(--dash-text-secondary)]">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} />
                {selectedJob.notes}
              </div>
            )}

            <div className="space-y-1.5 text-[12.5px] text-[var(--dash-text-secondary)]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} />
                Aberto em {fmtDate(selectedJob.created_at)}
              </div>
              {selectedJob.status === "Concluído" ? (
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#16A34A" }} />
                  Concluído em {fmtDate(selectedJob.completed_at)}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} />
                  Próxima visita: {selectedJob.next_visit_date ? fmtDate(selectedJob.next_visit_date) : "Nenhuma agendada"}
                </div>
              )}
            </div>

            {selectedJob.status !== "Concluído" && (
              <button
                onClick={() => completeJobMut.mutate(selectedJob.job_id)}
                disabled={completeJobMut.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
                style={{ background: "#16A34A" }}
              >
                <Check className="h-4 w-4" /> {completeJobMut.isPending ? "Concluindo..." : "Concluir serviço"}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const SERVICE_JOB_SUGGESTIONS = ["Troca de filtro", "Tratamento de fosfato", "Reparo de equipamento", "Outro"];

const clientAvatarColors = [
  "bg-sky-200 text-sky-800", "bg-orange-200 text-orange-800", "bg-purple-200 text-purple-800",
  "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800", "bg-green-200 text-green-800",
];

const WEEKDAY_BADGE: Record<string, { bg: string; text: string }> = {
  "Seg": { bg: "#DBEAFE", text: "#2563EB" },
  "Ter": { bg: "#DCFCE7", text: "#16A34A" },
  "Qua": { bg: "#FEF3C7", text: "#B45309" },
  "Qui": { bg: "#EDE4FB", text: "#7C3AED" },
  "Sex": { bg: "#FEE2E2", text: "#DC2626" },
  "Sáb": { bg: "#CFFAFE", text: "#0891B2" },
  "Dom": { bg: "#FCE7F3", text: "#DB2777" },
};

function clientFullAddress(c: TechnicianClient) {
  return [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
}

// Read-only client list for the technician's own assigned clients — no
// edit/delete (technicians have no write access to the clients table) and
// no drill-down into a detail page, so no chevron either.
function TecnicoClientsList({ clients, isLoading, onSelectClient }: { clients: TechnicianClient[]; isLoading: boolean; onSelectClient: (c: TechnicianClient) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Meus Clientes</h1>
        <p className="text-[12px] text-[var(--dash-text-muted)]">Clientes atribuídos a você</p>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>
      ) : clients.length === 0 ? (
        <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhum cliente atribuído</p>
        </div>
      ) : (
        clients.map((c, idx) => {
          const address = clientFullAddress(c);
          const isOnRoute = (c.service_days ?? []).length > 0;
          const commercial = isCommercial(c.client_type);
          return (
            <div
              key={c.client_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectClient(c)}
              onKeyDown={(e) => { if (e.key === "Enter") onSelectClient(c); }}
              className="cursor-pointer rounded-[14px] border border-[var(--dash-border)] bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold ${clientAvatarColors[idx % clientAvatarColors.length]}`}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <span className="block text-[14px] font-bold text-[var(--dash-text)] underline decoration-dotted underline-offset-2">
                      {c.name}
                    </span>
                    <span
                      title={commercial ? "Comercial" : "Residencial"}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                      style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                    >
                      {commercial ? <Building2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-extrabold tabular-nums text-[var(--dash-text)]">{fmt(Number(c.monthly_value || 0))}</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[12.5px]">
                {c.phone && (
                  <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-[var(--dash-text-secondary)]">
                    <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {formatPhone(c.phone)}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 truncate text-[var(--dash-link)]">
                    <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">{c.email}</span>
                  </a>
                )}
                {address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2 text-[var(--dash-text-secondary)]"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {address}
                  </a>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {c.status !== "Ativo" ? (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: "var(--dash-border-table)", color: "var(--dash-text-muted-2)" }}>
                    Inativo
                  </span>
                ) : isOnRoute ? (
                  (c.service_days ?? []).map((day) => {
                    const badge = WEEKDAY_BADGE[day] ?? { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" };
                    return (
                      <span key={day} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: badge.bg, color: badge.text }}>
                        {day}
                      </span>
                    );
                  })
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" }}>
                    Cliente
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function serviceJobAge(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Há 1 dia";
  return `Há ${days} dias`;
}

function TecnicoServicesList({
  jobs, isLoading, onSelectJob, onNewJob,
}: { jobs: ServiceJob[]; isLoading: boolean; onSelectJob: (j: ServiceJob) => void; onNewJob: () => void }) {
  const open = jobs.filter((j) => j.status !== "Concluído");
  const done = jobs.filter((j) => j.status === "Concluído");

  function JobCard({ job }: { job: ServiceJob }) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectJob(job)}
        onKeyDown={(e) => { if (e.key === "Enter") onSelectJob(job); }}
        className="cursor-pointer rounded-[14px] border border-[var(--dash-border)] bg-white p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">{job.title}</div>
            <div className="truncate text-[12.5px] text-[var(--dash-text-muted-2)]">{job.client_name}</div>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={
              job.status === "Concluído"
                ? { background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" }
                : { background: "var(--dash-badge-sent-bg)", color: "var(--dash-badge-sent-text)" }
            }
          >
            {job.status}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-[var(--dash-text-muted-2)]">
          <span>{job.status === "Concluído" ? `Concluído em ${fmtDate(job.completed_at)}` : serviceJobAge(job.created_at)}</span>
          {job.status !== "Concluído" && (
            <span>{job.next_visit_date ? `Próxima visita: ${fmtDate(job.next_visit_date)}` : "Sem visita agendada"}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Serviços</h1>
          <p className="text-[12px] text-[var(--dash-text-muted)]">Reparos e tarefas em aberto</p>
        </div>
        <button
          onClick={onNewJob}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white"
          style={{ background: "var(--dash-navy)" }}
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
          <Wrench className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhum serviço em aberto</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-[12px] font-bold uppercase tracking-[.06em] text-[var(--dash-text-muted-2)]">Em aberto ({open.length})</h2>
              {open.map((j) => <JobCard key={j.job_id} job={j} />)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-[12px] font-bold uppercase tracking-[.06em] text-[var(--dash-text-muted-2)]">Concluídos ({done.length})</h2>
              {done.map((j) => <JobCard key={j.job_id} job={j} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function homeDateLabel(d: Date) {
  const isToday = toDateStr(d) === toDateStr(new Date());
  const formatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  return isToday ? `Hoje, ${formatted}` : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

const ALERT_META: Record<TechnicianAlert["alert_type"], { label: string; icon: typeof AlertTriangle; bg: string; text: string }> = {
  filtro: { label: "Filtro vencido", icon: AlertTriangle, bg: "#FEE2E2", text: "#DC2626" },
  cloro: { label: "Cloro muito baixo", icon: FlaskConical, bg: "#FEF3C7", text: "#B45309" },
  pagamento: { label: "Pagamento vencido", icon: FileText, bg: "#DBEAFE", text: "#2563EB" },
};

// Home dashboard — the technician's landing screen (replaces the day's stop
// list as the default view; that list still lives under the "Rota" tab).
// All numbers come from SECURITY DEFINER RPCs since the technician has no
// direct read access to clients' financial fields, chemicals, or invoices.
function TecnicoHomeDashboard({
  date, stats, alerts, isLoading, error, onJumpToday,
}: { date: Date; stats: TechnicianDashboardStats | null; alerts: TechnicianAlert[]; isLoading: boolean; error: Error | null; onJumpToday: () => void }) {
  if (error) {
    return (
      <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-4 text-center">
        <AlertTriangle className="mx-auto h-6 w-6" style={{ color: "var(--dash-red)" }} />
        <p className="mt-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Não foi possível carregar o painel</p>
        <p className="mt-1 break-words text-[11px] text-[var(--dash-text-muted)]">{error.message}</p>
      </div>
    );
  }
  if (isLoading || !stats) {
    return <p className="py-10 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>;
  }

  const totalAlerts = stats.filters_overdue + stats.pools_with_alert + stats.overdue_invoices;
  const weekCards = [
    { label: "Segunda", value: stats.seg_routes },
    { label: "Terça", value: stats.ter_routes },
    { label: "Quarta", value: stats.qua_routes },
    { label: "Quinta", value: stats.qui_routes },
    { label: "Sexta", value: stats.sex_routes },
  ];
  const statCards = [
    { icon: CalendarDays, tint: "#2563EB", value: stats.clients_today, label: "Clientes hoje" },
    { icon: CheckCircle2, tint: "#16A34A", value: stats.completed_today, label: "Concluídos" },
    { icon: AlertTriangle, tint: "#DC2626", value: totalAlerts, label: "Alertas" },
    { icon: DollarSign, tint: "#0891B2", value: fmt(stats.avg_cost_per_visit), label: "Custo médio/visita" },
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={onJumpToday}
        className="flex w-full items-center justify-between rounded-[14px] border border-[var(--dash-border)] bg-white p-3"
      >
        <span className="flex items-center gap-2 text-[13px] font-bold capitalize text-[var(--dash-text)]">
          <CalendarDays className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> {homeDateLabel(date)}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />
      </button>

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

      <div className="rounded-[18px] p-4 text-white" style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/90" style={{ color: "#2563EB" }}>
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-white/85">Receita estimada da rota</div>
            <div className="text-2xl font-extrabold tabular-nums">{fmt(stats.estimated_route_revenue)}</div>
            <div className="text-[11px] text-white/85">
              Média por visita: <span className="font-bold">{fmt(stats.avg_revenue_per_pool)}</span>
            </div>
            <div className="text-[10px] text-white/70">valor mensal ÷ visitas por semana</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-bold text-[var(--dash-text)]">Rota da semana</h2>
        <div className="grid grid-cols-5 gap-1.5">
          {weekCards.map((w) => (
            <div key={w.label} className="rounded-[12px] border border-[var(--dash-border)] bg-white p-2 text-center">
              <div className="truncate text-[10px] font-semibold text-[var(--dash-text-muted-2)]">{w.label}</div>
              <div className="mt-1 text-[15px] font-extrabold text-[var(--dash-text)]">{w.value}</div>
              <div className="text-[9px] text-[var(--dash-text-muted)]">rotas</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--dash-text)]">Ação necessária</h2>
          <button onClick={() => toast.info("Ver todas — em breve")} className="text-[12px] font-semibold" style={{ color: "var(--dash-link)" }}>
            Ver todas
          </button>
        </div>
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-[var(--dash-text-muted)]">Nenhuma ação pendente</p>
        ) : (
          <div className="divide-y divide-[var(--dash-border-table)]">
            {alerts.slice(0, 3).map((a, i) => {
              const meta = ALERT_META[a.alert_type];
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 py-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: meta.bg, color: meta.text }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{meta.label}</div>
                    <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{a.client_name}</div>
                  </div>
                  <div className="shrink-0 text-[12px] font-bold" style={{ color: a.days <= 0 ? "#B45309" : "#DC2626" }}>
                    {a.days <= 0 ? "Hoje" : `${a.days} dias`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-bold text-[var(--dash-text)]">Resumo rápido</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "#EDE4FB", color: "#7C3AED" }}>
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--dash-text-muted)]">Filtros atrasados</div>
              <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{stats.filters_overdue}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--dash-text-muted)]">Piscinas com alerta</div>
              <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{stats.pools_with_alert}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
