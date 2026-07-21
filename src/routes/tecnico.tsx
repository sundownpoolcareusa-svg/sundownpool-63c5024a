import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GoogleMap, Marker, TrafficLayer, useJsApiLoader } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo } from "@/components/AppLogo";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import {
  CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Phone, Navigation, Play, Check, FlaskConical, LogOut, MapPin, Mail,
  CheckCircle2, Timer, Route as RouteIcon, Car, Waves, Building2, MoreHorizontal, Users, Wrench, Menu, Plus,
  AlertTriangle, DollarSign, Filter, FileText,
} from "lucide-react";
import {
  getMyTechnician, getMyTechnicianStops, ensureMyTechnicianStops, updateMyStopStatus, getMyTechnicianClients,
  getMyTechnicianDashboard, getMyTechnicianAlerts,
  initials, fmt, type StopStatus, type TechnicianStop, type TechnicianClient, type TechnicianDashboardStats, type TechnicianAlert,
} from "@/lib/db";
import { formatPhone } from "@/lib/pdf";
import { toast } from "sonner";
import tecnicoIcon from "@/assets/tecnico-apple-touch-icon.png";

export const Route = createFileRoute("/tecnico")({
  head: () => ({
    meta: [
      { title: "Route - Sundown" },
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

type LatLng = { lat: number; lng: number };

function TecnicoRouteMap({ stops }: { stops: TechnicianStop[] }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: "sundown-google-maps", googleMapsApiKey: GOOGLE_MAPS_KEY });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const points = stops
    .map((s) => ({ s, pos: (s.client_lat != null && s.client_lng != null ? { lat: s.client_lat, lng: s.client_lng } : null) as LatLng | null }))
    .filter((p): p is { s: TechnicianStop; pos: LatLng } => !!p.pos);
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

  // Drawn via the raw Maps SDK — see rotas.tsx RouteMap for why.
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

  const wrapperClass = "relative h-56 w-full overflow-hidden rounded-2xl border border-[var(--dash-border)]";

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
        onLoad={(m) => { mapRef.current = m; setMap(m); }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {showTraffic && <TrafficLayer />}
        {points.map((p) => (
          <Marker
            key={p.s.stop_id}
            position={p.pos}
            title={p.s.client_name}
            label={{ text: String(p.s.position + 1), color: "#fff", fontWeight: "bold", fontSize: "12px" }}
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
        onClick={() => toast.info("Otimização de rota — em breve")}
        className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--dash-text-secondary)] shadow-md"
      >
        <RouteIcon className="h-3.5 w-3.5" style={{ color: "var(--dash-navy)" }} /> Rota otimizada
      </button>
      <button
        onClick={() => setShowTraffic((v) => !v)}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold shadow-md"
        style={{ background: showTraffic ? "var(--dash-navy)" : "#fff", color: showTraffic ? "#fff" : "var(--dash-text-secondary)" }}
      >
        <Car className="h-3.5 w-3.5" /> Tráfego
      </button>
    </div>
  );
}

function TecnicoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checkedSession, setCheckedSession] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const dateStr = toDateStr(date);
  const [view, setView] = useState<"inicio" | "rota" | "clientes">("inicio");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
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
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["my-technician-dashboard", dateStr],
    queryFn: () => getMyTechnicianDashboard(dateStr),
    enabled: checkedSession,
  });
  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["my-technician-alerts", dateStr],
    queryFn: () => getMyTechnicianAlerts(dateStr),
    enabled: checkedSession,
  });

  const statusMut = useMutation({
    mutationFn: ({ stopId, status }: { stopId: string; status: StopStatus }) => updateMyStopStatus(stopId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-technician-stops", dateStr] }),
    onError: (e: Error) => toast.error(e.message),
  });

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
            onJumpToday={() => setDate(new Date())}
          />
        ) : view === "clientes" ? (
          <TecnicoClientsList clients={myClients} isLoading={isLoadingClients} />
        ) : (
          <>
        <div className="flex items-center justify-between rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
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

        <MapErrorBoundary key={dateStr}>
          <TecnicoRouteMap key={dateStr} stops={sorted} />
        </MapErrorBoundary>

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
              const isLast = i === sorted.length - 1;
              return (
                <div key={stop.stop_id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: statusMarkerColor(stop.status) }}>
                      {stop.position + 1}
                    </div>
                    {!isLast && <div className="w-px flex-1 border-l-2 border-dashed border-[var(--dash-border)]" style={{ minHeight: 8 }} />}
                  </div>
                  <div className="mb-3 flex-1 rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
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
                        <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badgeStyle.bg, color: badgeStyle.text }}>
                          {stopStatusLabel(stop.status)}
                        </span>
                        <div className="mt-1 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <span
                        className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-bold"
                        style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                      >
                        {commercial ? <Building2 className="h-3 w-3" /> : <Waves className="h-3 w-3" />}
                        {commercial ? "Comercial" : "Residencial"}
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

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--dash-border)] bg-white px-2 py-2">
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
        <button onClick={() => comingSoon("Serviços")} className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-medium text-[var(--dash-text-muted-2)]">
          <Wrench className="h-5 w-5" />
          Serviços
        </button>
        <button onClick={() => comingSoon("Mais")} className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-medium text-[var(--dash-text-muted-2)]">
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>
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

// Read-only client list for the technician's own assigned clients — no
// edit/delete (technicians have no write access to the clients table) and
// no drill-down into a detail page, so no chevron either.
function TecnicoClientsList({ clients, isLoading }: { clients: TechnicianClient[]; isLoading: boolean }) {
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
            <div key={c.client_id} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold ${clientAvatarColors[idx % clientAvatarColors.length]}`}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[var(--dash-text)]">{c.name}</div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
                    >
                      {commercial ? <Building2 className="h-2.5 w-2.5" /> : <Waves className="h-2.5 w-2.5" />}
                      {commercial ? "Comercial" : "Residencial"}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-extrabold tabular-nums text-[var(--dash-text)]">{fmt(Number(c.monthly_value || 0))}</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[12.5px]">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-[var(--dash-text-secondary)]">
                    <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {formatPhone(c.phone)}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 truncate text-[var(--dash-link)]">
                    <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> <span className="truncate">{c.email}</span>
                  </a>
                )}
                {address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noreferrer"
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
  date, stats, alerts, isLoading, onJumpToday,
}: { date: Date; stats: TechnicianDashboardStats | null; alerts: TechnicianAlert[]; isLoading: boolean; onJumpToday: () => void }) {
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

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3 text-center">
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-full" style={{ background: `${c.tint}1A`, color: c.tint }}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-1.5 text-[17px] font-extrabold leading-tight text-[var(--dash-text)]">{c.value}</div>
              <div className="text-[10.5px] font-medium leading-tight text-[var(--dash-text-muted-2)]">{c.label}</div>
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
              Média por pool: <span className="font-bold">{fmt(stats.avg_revenue_per_pool)}</span>
            </div>
            <div className="text-[10px] text-white/70">valor mensal ÷ total de pools</div>
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
