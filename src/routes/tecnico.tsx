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
  Search, Waves, Bell, Clock, ShieldCheck, Cylinder, Droplet, ChevronUp, Equal,
} from "lucide-react";
import {
  getMyTechnician, getMyTechnicianStops, ensureMyTechnicianStops, updateMyStopStatus, getMyTechnicianClients,
  getMyTechnicianDashboard, getMyTechnicianAlerts, reorderStops, updateMyTechnicianProfile,
  getMyServiceJobs, createMyServiceJob, completeMyServiceJob, saveMyPushSubscription,
  initials, fmt, fmtDate, type StopStatus, type TechnicianStop, type TechnicianClient, type TechnicianDashboardStats, type TechnicianAlert,
  type ServiceJob, type ServiceJobPriority,
} from "@/lib/db";
import { formatPhone } from "@/lib/pdf";
import { toast } from "sonner";
import tecnicoIcon from "@/assets/tecnico-apple-touch-icon.png";

export const Route = createFileRoute("/tecnico")({
  validateSearch: (search: Record<string, unknown>): { view?: "inicio" | "rota" | "clientes" | "servicos" | "acoes" } => ({
    view: search.view === "rota" || search.view === "clientes" || search.view === "servicos" || search.view === "acoes" ? search.view : undefined,
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

// Web Push wants the VAPID public key as a raw Uint8Array, but env vars can
// only carry strings — decode the base64url form back into bytes.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
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
  const [view, setView] = useState<"inicio" | "rota" | "clientes" | "servicos" | "acoes">(search.view ?? "inicio");
  const [newJobOpen, setNewJobOpen] = useState(false);
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
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) ? "unsupported" : Notification.permission,
  );
  const [pushBusy, setPushBusy] = useState(false);
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
    mutationFn: (values: Parameters<typeof createMyServiceJob>[0]) => createMyServiceJob(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-jobs"] });
      setNewJobOpen(false);
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

  async function enablePushReminders() {
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        if (permission === "denied") toast.error("Notificações bloqueadas — ative nas configurações do navegador.");
        return;
      }
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!publicKey) {
        toast.error("Lembretes push ainda não configurados neste ambiente.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Assinatura inválida");
      await saveMyPushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      toast.success("Lembretes ativados neste dispositivo!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar os lembretes");
    } finally {
      setPushBusy(false);
    }
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
            serviceJobs={serviceJobs}
            isLoading={isLoadingDashboard || isLoadingAlerts}
            error={dashboardError ?? alertsError ?? null}
            onJumpToday={() => setDate(new Date())}
            onSelectJob={setSelectedJob}
            onOpenActions={() => setView("acoes")}
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
        ) : view === "acoes" ? (
          <TecnicoActionsList alerts={alerts} jobs={serviceJobs} onSelectJob={setSelectedJob} onBack={() => setView("inicio")} />
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

                <div className="rounded-xl border border-[var(--dash-border)] p-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--dash-text)]">
                    <Bell className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Lembretes push
                  </div>
                  {pushPermission === "unsupported" ? (
                    <p className="mt-1.5 text-[11.5px] text-[var(--dash-text-muted)]">
                      Este navegador não suporta lembretes. No iPhone, adicione o app à Tela de Início (compartilhar → Adicionar à Tela de Início) primeiro.
                    </p>
                  ) : pushPermission === "granted" ? (
                    <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: "#16A34A" }}>Ativados neste dispositivo</p>
                  ) : (
                    <>
                      <p className="mt-1.5 text-[11.5px] text-[var(--dash-text-muted)]">
                        Receba um aviso no celular perto do horário de um serviço agendado.
                      </p>
                      <button
                        onClick={enablePushReminders}
                        disabled={pushBusy}
                        className="mt-2 w-full rounded-[10px] border border-[var(--dash-border)] py-2 text-[12.5px] font-bold text-[var(--dash-text-secondary)] disabled:opacity-50"
                      >
                        {pushBusy ? "Ativando..." : "Ativar lembretes"}
                      </button>
                    </>
                  )}
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
        <NewServiceWizard
          clients={myClients}
          isSubmitting={createJobMut.isPending}
          onClose={() => setNewJobOpen(false)}
          onSubmit={(values) => createJobMut.mutate(values)}
        />
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

const OTHER_SERVICE = "Outro serviço";
const SERVICE_TYPE_OPTIONS: { key: string; icon: typeof FlaskConical }[] = [
  { key: "Tratamento de Phosphate", icon: FlaskConical },
  { key: "Check sistema de sal", icon: Cylinder },
  { key: "Leak no sistema", icon: Droplet },
  { key: "Vazamento na piscina", icon: Waves },
  { key: "Trocar filtro", icon: Filter },
];
const PRIORITY_OPTIONS: { key: ServiceJobPriority; bg: string; fg: string; icon: typeof ChevronUp }[] = [
  { key: "Baixa", bg: "#DCFCE7", fg: "#16A34A", icon: ChevronDown },
  { key: "Média", bg: "#FEF3C7", fg: "#B45309", icon: Equal },
  { key: "Alta", bg: "#FEE2E2", fg: "#DC2626", icon: ChevronUp },
];
const DURATION_OPTIONS = [
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
];
const REMINDER_OPTIONS = [
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
];

// Full-screen 4-step "Novo serviço" wizard (Cliente > Informações > Data e
// hora > Revisão), matching the reference design the owner provided.
function NewServiceWizard({
  clients, isSubmitting, onClose, onSubmit,
}: {
  clients: TechnicianClient[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: Parameters<typeof createMyServiceJob>[0]) => void;
}) {
  const [step, setStep] = useState<"cliente" | "info" | "data" | "revisao">("cliente");
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [notesText, setNotesText] = useState("");
  const [priority, setPriority] = useState<ServiceJobPriority | null>(null);
  const [schedDate, setSchedDate] = useState(() => toDateStr(new Date()));
  const [schedTime, setSchedTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState("30");

  const client = clients.find((c) => c.client_id === clientId) ?? null;
  const activeClients = clients.filter((c) => c.status === "Ativo");
  const search = clientSearch.trim().toLowerCase();
  const filteredClients = activeClients.filter(
    (c) => !search || c.name.toLowerCase().includes(search) || (c.address ?? "").toLowerCase().includes(search),
  );

  function toggleServiceType(key: string) {
    setServiceTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const canContinueInfo = serviceTypes.length > 0;
  const durationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? "";
  const reminderLabel = REMINDER_OPTIONS.find((r) => r.value === reminderMinutes)?.label ?? "";

  function buildTitle() {
    return serviceTypes.join(", ");
  }

  function handleConfirm() {
    if (!client) return;
    onSubmit({
      clientId: client.client_id,
      title: buildTitle(),
      notes: notesText.trim() || null,
      serviceTypes,
      priority,
      scheduledDate: schedDate || null,
      scheduledTime: schedTime || null,
      durationMinutes: duration ? Number(duration) : null,
      reminderEnabled,
      reminderMinutesBefore: reminderEnabled ? Number(reminderMinutes) : null,
    });
  }

  return (
    <div className="dash fixed inset-0 z-50 overflow-y-auto bg-[var(--dash-bg)]">
      <div className="mx-auto max-w-md p-4 pb-28">
        <div className="flex items-start gap-2">
          <button
            onClick={() => {
              if (step === "data") setStep("info");
              else if (step === "revisao") setStep("data");
              else onClose();
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--dash-text-secondary)]"
          >
            {step === "cliente" || step === "info" ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="flex-1 pr-9 text-center">
            <h1 className="text-lg font-extrabold text-[var(--dash-text)]">{step === "cliente" ? "Adicionar Serviço" : "Novo serviço"}</h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--dash-text-muted)]">
              {step === "cliente" && "Selecione o cliente para continuar"}
              {(step === "info" || step === "data") && "Preencha os detalhes para criar o serviço"}
              {step === "revisao" && "Revise os detalhes antes de finalizar"}
            </p>
          </div>
        </div>

        {step !== "cliente" && (
          <div className="mt-4 flex items-center justify-center">
            {(["info", "data", "revisao"] as const).map((s, i) => {
              const idx = (["info", "data", "revisao"] as const).indexOf(step);
              const active = s === step;
              const done = i < idx;
              return (
                <div key={s} className="flex items-center">
                  {i > 0 && <div className="h-[2px] w-8 sm:w-12" style={{ background: i <= idx ? "var(--dash-navy)" : "var(--dash-border)" }} />}
                  <div className="flex flex-col items-center gap-1 px-1">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold"
                      style={active || done ? { background: "var(--dash-navy)", color: "#fff" } : { background: "var(--dash-border-table)", color: "var(--dash-text-muted-2)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="whitespace-nowrap text-[10px] font-semibold" style={{ color: active ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}>
                      {s === "info" ? "Informações" : s === "data" ? "Data e hora" : "Revisão"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {step === "cliente" && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full rounded-[12px] border border-[var(--dash-border-input)] bg-white py-2.5 pl-9 pr-3 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <h2 className="text-[14px] font-bold text-[var(--dash-text)]">Clientes ativos</h2>
                <span className="rounded-full bg-[var(--dash-badge-paid-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--dash-badge-paid-text)]">
                  {activeClients.length}
                </span>
              </div>
              <p className="-mt-2 text-[11.5px] text-[var(--dash-text-muted)]">Somente clientes ativos aparecem na lista.</p>

              <div className="space-y-2">
                {filteredClients.map((c, idx) => (
                  <button
                    key={c.client_id}
                    onClick={() => { setClientId(c.client_id); setStep("info"); }}
                    className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3 text-left"
                  >
                    <ClientAvatarPhoto client={c} idx={idx} sizeClass="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">{c.name}</div>
                      <div className="truncate text-[12px] text-[var(--dash-text-muted)]">{clientFullAddress(c) || "—"}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--dash-badge-paid-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--dash-badge-paid-text)]">Ativo</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Nenhum cliente encontrado</p>
                )}
              </div>
            </>
          )}

          {step === "info" && client && (
            <>
              <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                <h2 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Cliente</h2>
                <button onClick={() => setStep("cliente")} className="flex w-full items-center gap-3 rounded-[12px] border border-[var(--dash-border)] p-2.5 text-left">
                  <ClientAvatarPhoto client={client} idx={0} sizeClass="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-[var(--dash-text)]">{client.name}</div>
                    <div className="truncate text-[11.5px] text-[var(--dash-text-muted)]">{clientFullAddress(client) || "—"}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
                </button>
              </div>

              <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                <h2 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Serviço a ser realizado</h2>
                <div className="space-y-2">
                  {SERVICE_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const checked = serviceTypes.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleServiceType(opt.key)}
                        className="flex w-full items-center gap-2 rounded-[12px] border p-2.5 text-left"
                        style={checked ? { borderColor: "var(--dash-navy)", background: "var(--dash-water-bg)" } : { borderColor: "var(--dash-border)" }}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-[12.5px] font-bold leading-tight text-[var(--dash-text)]">{opt.key}</span>
                        <span
                          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border"
                          style={checked ? { background: "var(--dash-navy)", borderColor: "var(--dash-navy)" } : { borderColor: "var(--dash-border)" }}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => toggleServiceType(OTHER_SERVICE)}
                    className="flex w-full items-center gap-2 rounded-[12px] border p-2.5 text-left"
                    style={serviceTypes.includes(OTHER_SERVICE) ? { borderColor: "var(--dash-navy)", background: "var(--dash-water-bg)" } : { borderColor: "var(--dash-border)" }}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold leading-tight text-[var(--dash-text)]">{OTHER_SERVICE}</span>
                      <span className="block text-[11px] text-[var(--dash-text-muted)]">Descreva um serviço personalizado</span>
                    </span>
                    <span
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border"
                      style={serviceTypes.includes(OTHER_SERVICE) ? { background: "var(--dash-navy)", borderColor: "var(--dash-navy)" } : { borderColor: "var(--dash-border)" }}
                    >
                      {serviceTypes.includes(OTHER_SERVICE) && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                <label className="text-[13px] font-bold text-[var(--dash-text)]">Descrição / Observações (opcional)</label>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value.slice(0, 250))}
                  rows={3}
                  placeholder="Adicione detalhes sobre o serviço..."
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
                />
                <div className="mt-1 text-right text-[10.5px] text-[var(--dash-text-muted)]">{notesText.length}/250</div>
              </div>

              <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                <h2 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Prioridade (opcional)</h2>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPriority((cur) => (cur === p.key ? null : p.key))}
                        className="flex items-center justify-center gap-1 rounded-full py-2 text-center text-[12.5px] font-bold"
                        style={priority === p.key ? { background: p.fg, color: "#fff" } : { background: p.bg, color: p.fg }}
                      >
                        <Icon className="h-3.5 w-3.5" /> {p.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === "data" && (
            <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[var(--dash-text)]">Data e hora do serviço</div>
                  <div className="text-[11.5px] text-[var(--dash-text-muted)]">Defina quando o serviço será realizado.</div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Data do serviço</label>
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full appearance-none rounded-[10px] border border-[var(--dash-border-input)] py-2 pl-9 pr-8 text-sm"
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Hora do serviço</label>
                <div className="relative mt-1">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                  <input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full appearance-none rounded-[10px] border border-[var(--dash-border-input)] py-2 pl-9 pr-8 text-sm"
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Duração estimada (opcional)</label>
                <div className="relative mt-1">
                  <Timer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full appearance-none rounded-[10px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-8 text-sm"
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label className="text-[13px] font-bold text-[var(--dash-text)]">Lembrete para o técnico (opcional)</label>
                <button
                  onClick={() => setReminderEnabled((v) => !v)}
                  className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                  style={{ background: reminderEnabled ? "var(--dash-navy)" : "var(--dash-border)" }}
                >
                  <span
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: reminderEnabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              {reminderEnabled && (
                <div className="mt-2 rounded-[12px] p-2.5" style={{ background: "var(--dash-water-bg)" }}>
                  <div className="flex items-start gap-2 text-[12px] text-[var(--dash-water-icon)]">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Enviaremos um lembrete para o técnico antes do horário do serviço.</span>
                  </div>
                  <div className="relative mt-2">
                    <select
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(e.target.value)}
                      className="w-full appearance-none rounded-[10px] border border-[var(--dash-border-input)] bg-white py-2 pl-3 pr-8 text-sm"
                    >
                      {REMINDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-[12px] bg-[var(--dash-bg)] p-3">
                <div className="mb-1.5 text-[12px] font-bold text-[var(--dash-navy)]">Resumo</div>
                <div className="flex items-center justify-between text-[12.5px] text-[var(--dash-text-secondary)]">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Data</span>
                  <span className="font-semibold text-[var(--dash-text)]">{fmtDate(schedDate)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12.5px] text-[var(--dash-text-secondary)]">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Hora</span>
                  <span className="font-semibold text-[var(--dash-text)]">{schedTime}</span>
                </div>
              </div>
            </div>
          )}

          {step === "revisao" && client && (
            <>
              <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                <div className="mb-2 flex items-center gap-2 text-[14px] font-bold text-[var(--dash-text)]">
                  <FileText className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Resumo do serviço
                </div>
                <div className="divide-y divide-[var(--dash-border-table)]">
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[var(--dash-text-muted-2)]">Cliente</div>
                      <div className="mt-1 flex items-center gap-2">
                        <ClientAvatarPhoto client={client} idx={0} sizeClass="h-8 w-8" />
                        <div>
                          <div className="text-[13px] font-bold text-[var(--dash-text)]">{client.name}</div>
                          <div className="text-[11px] text-[var(--dash-text-muted)]">{clientFullAddress(client) || "—"}</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setStep("cliente")}><ChevronRight className="h-4 w-4 text-[var(--dash-text-muted)]" /></button>
                  </div>

                  <div className="py-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[var(--dash-text-muted-2)]">Serviço a ser realizado</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {serviceTypes.map((s) => (
                        <span key={s} className="rounded-full bg-[var(--dash-badge-paid-bg)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--dash-badge-paid-text)]">{s}</span>
                      ))}
                    </div>
                    {notesText.trim() && (
                      <p className="mt-1.5 text-[12.5px] text-[var(--dash-text-secondary)]">{notesText.trim()}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--dash-text-secondary)]"><CalendarDays className="h-3.5 w-3.5" /> Data</span>
                    <span className="text-[12.5px] font-semibold text-[var(--dash-text)]">{fmtDate(schedDate)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--dash-text-secondary)]"><Clock className="h-3.5 w-3.5" /> Hora</span>
                    <span className="text-[12.5px] font-semibold text-[var(--dash-text)]">{schedTime}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--dash-text-secondary)]"><Timer className="h-3.5 w-3.5" /> Duração estimada</span>
                    <span className="text-[12.5px] font-semibold text-[var(--dash-text)]">{durationLabel}</span>
                  </div>
                  {priority && (
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-[12.5px] text-[var(--dash-text-secondary)]">Prioridade</span>
                      <span className="text-[12.5px] font-semibold text-[var(--dash-text)]">{priority}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--dash-text-secondary)]"><Bell className="h-3.5 w-3.5" /> Lembrete</span>
                    <span className="text-[12.5px] font-semibold text-[var(--dash-text)]">{reminderEnabled ? reminderLabel : "Desativado"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-[14px] p-3 text-[12px]" style={{ background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}>
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Ao confirmar, o serviço aparecerá na sua lista de Serviços em aberto.</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--dash-border)] bg-white p-3">
        <div className="mx-auto flex max-w-md gap-2">
          {step === "cliente" && (
            <button onClick={onClose} className="flex-1 rounded-[14px] border border-[var(--dash-border)] py-3 text-[14px] font-bold text-[var(--dash-text-secondary)]">
              Cancelar
            </button>
          )}
          {step === "info" && (
            <>
              <button onClick={onClose} className="flex-1 rounded-[14px] border border-[var(--dash-border)] py-3 text-[14px] font-bold text-[var(--dash-text-secondary)]">
                Cancelar
              </button>
              <button
                onClick={() => setStep("data")}
                disabled={!canContinueInfo}
                className="flex-1 rounded-[14px] py-3 text-[14px] font-bold text-white disabled:opacity-50"
                style={{ background: "var(--dash-navy)" }}
              >
                Continuar
              </button>
            </>
          )}
          {step === "data" && (
            <>
              <button onClick={() => setStep("info")} className="flex-1 rounded-[14px] border border-[var(--dash-border)] py-3 text-[14px] font-bold text-[var(--dash-text-secondary)]">
                Voltar
              </button>
              <button onClick={() => setStep("revisao")} className="flex-1 rounded-[14px] py-3 text-[14px] font-bold text-white" style={{ background: "var(--dash-navy)" }}>
                Continuar
              </button>
            </>
          )}
          {step === "revisao" && (
            <>
              <button onClick={() => setStep("data")} className="flex-1 rounded-[14px] border border-[var(--dash-border)] py-3 text-[14px] font-bold text-[var(--dash-text-secondary)]">
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 rounded-[14px] py-3 text-[14px] font-bold text-white disabled:opacity-50"
                style={{ background: "var(--dash-navy)" }}
              >
                {isSubmitting ? "Criando..." : "Confirmar serviço"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

// Circular avatar showing the client's first pool photo (signed URL, same
// private "client-photos" bucket the owner side uses) when one exists,
// falling back to the initials circle used everywhere else in this app.
function ClientAvatarPhoto({ client, idx, sizeClass }: { client: TechnicianClient; idx: number; sizeClass: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = client.pool_photos?.[0];
    if (!path) { setUrl(null); return; }
    let alive = true;
    supabase.storage.from("client-photos").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [client.pool_photos]);

  if (url) {
    return <img src={url} alt="" className={`${sizeClass} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`grid ${sizeClass} shrink-0 place-items-center rounded-full text-[12px] font-bold ${clientAvatarColors[idx % clientAvatarColors.length]}`}>
      {initials(client.name)}
    </div>
  );
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
  date, stats, alerts, serviceJobs, isLoading, error, onJumpToday, onSelectJob, onOpenActions,
}: {
  date: Date; stats: TechnicianDashboardStats | null; alerts: TechnicianAlert[]; serviceJobs: ServiceJob[];
  isLoading: boolean; error: Error | null; onJumpToday: () => void; onSelectJob: (j: ServiceJob) => void; onOpenActions: () => void;
}) {
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
  const statCards: { icon: typeof CalendarDays; tint: string; value: string | number; label: string; onClick?: () => void }[] = [
    { icon: CalendarDays, tint: "#2563EB", value: stats.clients_today, label: "Clientes hoje" },
    { icon: CheckCircle2, tint: "#16A34A", value: stats.completed_today, label: "Concluídos" },
    { icon: AlertTriangle, tint: "#DC2626", value: totalAlerts, label: "Alertas", onClick: onOpenActions },
    { icon: DollarSign, tint: "#0891B2", value: fmt(stats.avg_cost_per_visit), label: "Custo médio/visita" },
  ];
  const openJobs = serviceJobs.filter((j) => j.status !== "Concluído");

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
          const Tag = c.onClick ? "button" : "div";
          return (
            <Tag key={c.label} onClick={c.onClick} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-2.5 text-center">
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full" style={{ background: `${c.tint}1A`, color: c.tint }}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-1.5 text-[15px] font-extrabold leading-tight text-[var(--dash-text)]">{c.value}</div>
              <div className="text-[9.5px] font-medium leading-tight text-[var(--dash-text-muted-2)]">{c.label}</div>
            </Tag>
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
          <button onClick={onOpenActions} className="text-[12px] font-semibold" style={{ color: "var(--dash-link)" }}>
            Ver todas
          </button>
        </div>
        {alerts.length === 0 && openJobs.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-[var(--dash-text-muted)]">Nenhuma ação pendente</p>
        ) : (
          <div className="divide-y divide-[var(--dash-border-table)]">
            {alerts.slice(0, 5).map((a, i) => {
              const meta = ALERT_META[a.alert_type];
              const Icon = meta.icon;
              return (
                <div key={`alert-${i}`} className="flex items-center gap-2.5 py-2.5">
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
            {openJobs.slice(0, 5).map((j) => (
              <button
                key={j.job_id}
                onClick={() => onSelectJob(j)}
                className="flex w-full items-center gap-2.5 py-2.5 text-left"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "#DBEAFE", color: "#2563EB" }}>
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{j.title}</div>
                  <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{j.client_name}</div>
                </div>
                <div className="shrink-0 text-[12px] font-bold" style={{ color: "#2563EB" }}>
                  {serviceJobAge(j.created_at)}
                </div>
              </button>
            ))}
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
          <button onClick={onOpenActions} className="flex items-center gap-2.5 rounded-[14px] border border-[var(--dash-border)] bg-white p-3 text-left">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--dash-text-muted)]">Piscinas com alerta</div>
              <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{stats.pools_with_alert}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Full "Ação necessária" list, reached via "Ver todas" or by tapping the
// Alertas/Piscinas com alerta stat cards — same row design as the home
// card's preview, but unsliced (all alerts + all open service jobs).
function TecnicoActionsList({
  alerts, jobs, onSelectJob, onBack,
}: { alerts: TechnicianAlert[]; jobs: ServiceJob[]; onSelectJob: (j: ServiceJob) => void; onBack: () => void }) {
  const openJobs = jobs.filter((j) => j.status !== "Concluído");
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Ação necessária</h1>

      {alerts.length === 0 && openJobs.length === 0 ? (
        <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhuma ação pendente</p>
        </div>
      ) : (
        <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
          <div className="divide-y divide-[var(--dash-border-table)]">
            {alerts.map((a, i) => {
              const meta = ALERT_META[a.alert_type];
              const Icon = meta.icon;
              return (
                <div key={`alert-${i}`} className="flex items-center gap-2.5 py-2.5">
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
            {openJobs.map((j) => (
              <button
                key={j.job_id}
                onClick={() => onSelectJob(j)}
                className="flex w-full items-center gap-2.5 py-2.5 text-left"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "#DBEAFE", color: "#2563EB" }}>
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{j.title}</div>
                  <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{j.client_name}</div>
                </div>
                <div className="shrink-0 text-[12px] font-bold" style={{ color: "#2563EB" }}>
                  {serviceJobAge(j.created_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
