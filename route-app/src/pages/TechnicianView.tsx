import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, ListChecks, Clock, Waves, ChevronDown, LayoutDashboard } from "lucide-react";
import { MapView } from "@/components/MapView";
import { DaySelector } from "@/components/DaySelector";
import { BottomNav } from "@/components/BottomNav";
import { TechnicianProgressCard } from "@/components/TechnicianProgressCard";
import { NextStopCard, UpcomingStopRow } from "@/components/StopListItem";
import { SummaryCards } from "@/components/SummaryCards";
import { technicians, stopsFor, summaryFor, currentLocation } from "@/mock-data";

const technician = technicians.find((t) => t.id === currentLocation.technicianId)!;

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
  const nextStop = useMemo(() => allStops.find((s) => s.status === "current" || s.status === "upcoming"), [allStops]);
  const upcoming = useMemo(
    () => allStops.filter((s) => s.status !== "completed" && s.id !== nextStop?.id),
    [allStops, nextStop],
  );
  const summary = summaryFor(technician.id);

  const cards = [
    { label: "Paradas hoje", value: summary.total, icon: ListChecks, tint: "#2563EB" },
    { label: "Concluídas", value: summary.completed, icon: CheckCircle2, tint: "#16A34A" },
    { label: "Restantes", value: summary.remaining, icon: Clock, tint: "#E8813A" },
    { label: "Previsão final", value: summary.etaFinish, icon: Waves, tint: "#1487A6" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--dash-bg)] pb-24">
      <header className="flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-[9px] text-white" style={{ background: "var(--dash-navy)" }}>
            <Waves className="h-[18px] w-[18px]" />
          </div>
          <span className="text-[15px] font-extrabold text-[var(--dash-text)]">Rota</span>
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
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: "var(--dash-red)" }} />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1">
              <div className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: technician.color }}>
                {technician.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
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
        <div>
          <h1 className="text-xl font-extrabold text-[var(--dash-text)]">
            {greeting()}, {technician.name.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-[var(--dash-text-muted-2)]">
            {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <DaySelector selected={selectedDay} onSelect={setSelectedDay} />

        <SummaryCards cards={cards} />

        <TechnicianProgressCard name={technician.name} completed={summary.completed} total={summary.total} />

        <MapView stops={allStops} currentLocation={currentLocation} route className="h-56" />

        {nextStop && <NextStopCard stop={nextStop} />}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold text-[var(--dash-text)]">Próximas paradas</h2>
            <div className="space-y-2">
              {upcoming.map((s) => (
                <UpcomingStopRow key={s.id} stop={s} />
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav active="rota" />
    </div>
  );
}
