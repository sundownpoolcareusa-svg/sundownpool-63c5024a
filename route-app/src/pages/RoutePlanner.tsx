import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Waves,
  Sun,
  ListChecks,
  CheckCircle2,
  Clock,
  Route as RouteIcon,
  Sparkles,
  Smartphone,
  CalendarDays,
} from "lucide-react";
import { MapView } from "@/components/MapView";
import { TechnicianSelector } from "@/components/TechnicianSelector";
import { Timeline } from "@/components/Timeline";
import { CurrentStopDetail } from "@/components/CurrentStopDetail";
import { RouteNotesQuickActions } from "@/components/RouteNotesQuickActions";
import { technicians, stopsFor, statsFor, currentLocation, mapLabels } from "@/mock-data";
import { toast } from "sonner";

const MAP_MODES = [
  { key: "map", label: "Map" },
  { key: "satellite", label: "Satellite" },
] as const;

export function RoutePlanner() {
  const [selectedTechId, setSelectedTechId] = useState(technicians[0].id);
  const [mapMode, setMapMode] = useState<(typeof MAP_MODES)[number]["key"]>("map");
  const [trafficOn, setTrafficOn] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const stops = stopsFor(selectedTechId);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>(
    stops.find((s) => s.status === "current")?.id ?? stops[0]?.id,
  );
  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedStopId) ?? stops[0],
    [stops, selectedStopId],
  );
  const stats = statsFor(selectedTechId);
  const selectedTech = technicians.find((t) => t.id === selectedTechId)!;

  const cards = [
    { label: "Total Stops", value: stats.total, icon: ListChecks, tint: "#2563EB" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, tint: "#16A34A" },
    { label: "Est. Time Left", value: stats.timeLeft, icon: Clock, tint: "#E8813A" },
    { label: "Total Distance", value: stats.distance, icon: RouteIcon, tint: "#7C3AED" },
  ];

  const notes = stops.filter((s) => s.notes).map((s) => s.notes as string);

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const fullDateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const mapTint = mapMode === "satellite" ? { filter: "sepia(0.25) saturate(1.3)" } : undefined;

  return (
    <div className="min-h-screen bg-[var(--dash-bg)] pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-3.5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] text-white" style={{ background: "var(--dash-navy)" }}>
            <Waves className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[16px] font-extrabold text-[var(--dash-text)]">Route Planner</div>
            <div className="text-[12px] text-[var(--dash-text-muted-2)]">Manage daily routes and stops</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="relative flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]">
            <CalendarDays className="h-4 w-4 text-[var(--dash-text-muted)]" />
            {dateLabel}
            <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <div className="hidden items-center gap-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary-2)] sm:flex">
            <Sun className="h-4 w-4 text-[var(--dash-orange)]" />
            <span>
              87°F
              <br />
              Sunny
            </span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 rounded-full border border-[var(--dash-border)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--dash-text-secondary-2)]"
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile view
          </Link>
          <button className="relative">
            <Bell className="h-5 w-5 text-[var(--dash-text-secondary)]" />
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: "var(--dash-red)" }}>
              3
            </span>
          </button>
          <button className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: selectedTech.color }}>
              {selectedTech.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-[13px] font-bold text-[var(--dash-text)]">{selectedTech.name}</div>
              <div className="text-[11px] text-[var(--dash-text-muted-2)]">Administrator</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap items-stretch gap-4 rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
          <div className="min-w-[280px] flex-1">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--dash-text-muted-2)]">Select Technician</h2>
            <TechnicianSelector technicians={technicians} selectedId={selectedTechId} onSelect={setSelectedTechId} />
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

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[var(--dash-text)]">{fullDateLabel}</h2>
              <button
                onClick={() => toast.success("Route optimized! (simulation — no Google Maps yet)")}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white"
                style={{ background: "var(--dash-green)" }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Optimize Route
              </button>
            </div>

            <Timeline stops={stops} selectedStopId={selectedStop?.id} onSelect={(s) => setSelectedStopId(s.id)} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dash-border)] pt-3 text-[11px] font-medium text-[var(--dash-text-muted-2)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-green)" }} /> Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#2563EB" }} /> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--dash-text-muted)" }} /> Upcoming
                </span>
              </div>
              <span>Last updated: 7:30 AM</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold text-[var(--dash-text)]">Route Map</h2>
              <div className="flex items-center gap-3">
                <div className="flex overflow-hidden rounded-full border border-[var(--dash-border)]">
                  {MAP_MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMapMode(m.key)}
                      className="px-3 py-1.5 text-[12px] font-semibold transition-colors"
                      style={{
                        background: mapMode === m.key ? "var(--dash-navy)" : "transparent",
                        color: mapMode === m.key ? "#fff" : "var(--dash-text-secondary-2)",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setTrafficOn((v) => !v)} className="flex items-center gap-2 text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">
                  Traffic
                  <span
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    style={{ background: trafficOn ? "var(--dash-navy)" : "var(--dash-border)" }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                      style={{ transform: trafficOn ? "translateX(19px)" : "translateX(3px)" }}
                    />
                  </span>
                </button>
              </div>
            </div>

            <MapView
              stops={stops}
              currentLocation={currentLocation.technicianId === selectedTechId ? currentLocation : undefined}
              route
              labels={mapLabels}
              zoomControls
              className="h-[360px]"
              style={mapTint}
            />

            {selectedStop && <CurrentStopDetail stop={selectedStop} />}
          </div>
        </div>

        <RouteNotesQuickActions notes={notes} />
      </main>
    </div>
  );
}
