import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, ListChecks, CheckCircle2, Clock, Route as RouteIcon, Menu, LayoutDashboard, Calendar } from "lucide-react";
import { MapView } from "@/components/MapView";
import { DaySelector } from "@/components/DaySelector";
import { BottomNav } from "@/components/BottomNav";
import { TechnicianProgressCard } from "@/components/TechnicianProgressCard";
import { StopRow } from "@/components/StopListItem";
import { SummaryCards } from "@/components/SummaryCards";
import { technicians, stopsFor, statsFor, currentLocation, mapLabels } from "@/mock-data";
import logo from "@/assets/sundown-logo-new-black.png";

const technician = technicians.find((t) => t.id === currentLocation.technicianId)!;
const initials = technician.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function TechnicianView() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  const allStops = stopsFor(technician.id);
  const currentStop = useMemo(() => allStops.find((s) => s.status === "current"), [allStops]);
  const nextStop = useMemo(
    () => allStops.find((s) => s.status === "upcoming" && s.id !== currentStop?.id),
    [allStops, currentStop],
  );
  const stats = statsFor(technician.id);

  const cards = [
    { label: "Paradas no total", value: stats.total, icon: ListChecks, tint: "#2563EB" },
    { label: "Concluídas", value: stats.completed, icon: CheckCircle2, tint: "#16A34A" },
    { label: "Tempo estimado restante", value: stats.timeLeft, icon: Clock, tint: "#E8813A" },
    { label: "Distância total", value: stats.distance, icon: RouteIcon, tint: "#7C3AED" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--dash-bg)] pb-24">
      <header className="flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-[var(--dash-text-secondary)]" />
          <img src={logo} alt="Sundown Pool Care" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/planner"
            className="hidden items-center gap-1 rounded-full border border-[var(--dash-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--dash-text-secondary-2)] sm:flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Painel
          </Link>
          <button className="relative">
            <Bell className="h-5 w-5 text-[var(--dash-text-secondary)]" />
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: "var(--dash-red)" }}>
              3
            </span>
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1">
              <div className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: technician.color }}>
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-1 shadow-lg">
                <div className="px-2.5 py-2 text-[12px] font-semibold text-[var(--dash-text)]">{technician.name}</div>
                <Link to="/planner" className="block rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--dash-text-secondary-2)] hover:bg-[var(--dash-bg)] sm:hidden">
                  Ver painel desktop
                </Link>
                <button className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[var(--dash-red)] hover:bg-[var(--dash-bg)]">Sair</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--dash-text)]">
              {greeting()}, {technician.name.split(" ")[0]} 👋
            </h1>
            <p className="text-[13px] text-[var(--dash-text-muted-2)]">
              {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]">
            <Calendar className="h-3.5 w-3.5" /> Hoje <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <DaySelector selected={selectedDay} onSelect={setSelectedDay} />

        <SummaryCards cards={cards} />

        <TechnicianProgressCard name={technician.name} initials={initials} color={technician.color} completed={stats.completed} total={stats.total} />

        <MapView stops={allStops} currentLocation={currentLocation} route labels={mapLabels} className="h-56" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-[var(--dash-text)]">Próxima parada</h2>
            <button className="text-[12px] font-semibold text-[var(--dash-link)]">Ver todas</button>
          </div>
          <div className="space-y-2">
            {currentStop && <StopRow stop={currentStop} highlighted />}
            {nextStop && <StopRow stop={nextStop} />}
          </div>
        </div>
      </main>

      <BottomNav active="rota" />
    </div>
  );
}
