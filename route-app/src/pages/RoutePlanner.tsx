import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, Waves, Sun, ListChecks, CheckCircle2, Loader2, Clock, Sparkles, Smartphone } from "lucide-react";
import { MapView } from "@/components/MapView";
import { SummaryCards } from "@/components/SummaryCards";
import { TechnicianSelector } from "@/components/TechnicianSelector";
import { Timeline } from "@/components/Timeline";
import { CurrentStopDetail } from "@/components/CurrentStopDetail";
import { RouteNotesQuickActions } from "@/components/RouteNotesQuickActions";
import { technicians, stopsFor, teamSummary, currentLocation } from "@/mock-data";
import { toast } from "sonner";

const MAP_MODES = [
  { key: "map", label: "Mapa" },
  { key: "satellite", label: "Satélite" },
  { key: "traffic", label: "Trânsito" },
] as const;

export function RoutePlanner() {
  const [selectedTechId, setSelectedTechId] = useState(technicians[0].id);
  const [mapMode, setMapMode] = useState<(typeof MAP_MODES)[number]["key"]>("map");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const stops = stopsFor(selectedTechId);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>(
    stops.find((s) => s.status === "current")?.id ?? stops[0]?.id,
  );
  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedStopId) ?? stops[0],
    [stops, selectedStopId],
  );
  const team = teamSummary();

  const cards = [
    { label: "Paradas hoje", value: team.totalStops, icon: ListChecks, tint: "#2563EB" },
    { label: "Concluídas", value: team.completed, icon: CheckCircle2, tint: "#16A34A" },
    { label: "Em serviço", value: team.inProgress, icon: Loader2, tint: "#E8813A" },
    { label: "Restantes", value: team.remaining, icon: Clock, tint: "#1487A6" },
  ];

  const mapTint =
    mapMode === "satellite" ? { filter: "sepia(0.25) saturate(1.3)" } : mapMode === "traffic" ? { filter: "hue-rotate(-15deg)" } : undefined;

  return (
    <div className="min-h-screen bg-[var(--dash-bg)] pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-3.5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] text-white" style={{ background: "var(--dash-navy)" }}>
            <Waves className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-[var(--dash-text)]">Route Planner</div>
            <div className="text-[11px] text-[var(--dash-text-muted-2)]">Sundown Pool Care</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]"
          />
          <div className="hidden items-center gap-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary-2)] sm:flex">
            <Sun className="h-4 w-4 text-[var(--dash-orange)]" /> 87°F Ensolarado
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 rounded-full border border-[var(--dash-border)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary-2)]"
          >
            <Smartphone className="h-3.5 w-3.5" /> Ver app mobile
          </Link>
          <button className="relative">
            <Bell className="h-5 w-5 text-[var(--dash-text-secondary)]" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: "var(--dash-red)" }} />
          </button>
          <button className="flex items-center gap-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--dash-navy)] text-[12px] font-bold text-white">AO</div>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-6 py-5">
        <TechnicianSelector technicians={technicians} selectedId={selectedTechId} onSelect={setSelectedTechId} />

        <SummaryCards cards={cards} />

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3">
            <h2 className="text-[13px] font-bold text-[var(--dash-text)]">Linha do tempo da rota</h2>
            <Timeline stops={stops} selectedStopId={selectedStop?.id} onSelect={(s) => setSelectedStopId(s.id)} />
          </div>

          <div className="space-y-3">
            <div className="relative">
              <MapView
                stops={stops}
                currentLocation={currentLocation.technicianId === selectedTechId ? currentLocation : undefined}
                route
                className="h-[360px]"
                style={mapTint}
              />
              <div className="absolute right-3 top-3 flex gap-1 rounded-full border border-[var(--dash-border)] bg-white/95 p-1 shadow-sm">
                {MAP_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMapMode(m.key)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                    style={{
                      background: mapMode === m.key ? "var(--dash-navy)" : "transparent",
                      color: mapMode === m.key ? "#fff" : "var(--dash-text-secondary-2)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toast.success("Rota otimizada! (simulação — sem Google Maps ainda)")}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold text-white shadow-md"
                style={{ background: "var(--dash-green)" }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Otimizar Rota
              </button>
            </div>

            {selectedStop && <CurrentStopDetail stop={selectedStop} />}
          </div>
        </div>

        <RouteNotesQuickActions />
      </main>
    </div>
  );
}
