import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listRoutesForDate, listTechnicians, todayStr } from "@/lib/db";
import { StopTimelineItem } from "@/components/StopTimelineItem";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Sidebar } from "@/components/Sidebar";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function RoutesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [technicianId, setTechnicianId] = useState<string>("all");

  const dateStr = toDateStr(selectedDate);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["routes-for-date", dateStr],
    queryFn: () => listRoutesForDate(dateStr),
  });

  const filteredRoutes = technicianId === "all" ? routes : routes.filter((r) => r.technician_id === technicianId);
  const stops = useMemo(
    () =>
      filteredRoutes
        .flatMap((r) => (r.route_stops ?? []).map((s) => ({ ...s, technicianName: r.technician?.name })))
        .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? "")),
    [filteredRoutes],
  );
  const completed = stops.filter((s) => s.status === "Concluído").length;

  const singleRoute = technicianId !== "all" ? filteredRoutes[0] : null;

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-60">
      <Sidebar />
      <header className="px-4 pb-4 pt-5 text-white md:px-8" style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))" }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Rotas</h1>
          <button aria-label="Nova rota"><Plus className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-8">
        {days.map((d) => {
          const active = isSameDay(d, selectedDate);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDate(d)}
              className="flex shrink-0 flex-col items-center gap-0.5 rounded-[12px] px-3 py-2 text-xs font-semibold"
              style={{
                background: active ? "var(--dash-navy)" : "var(--dash-surface-soft)",
                color: active ? "#fff" : "var(--dash-text-secondary)",
              }}
            >
              <span className="capitalize">{format(d, "EEE", { locale: ptBR })}</span>
              <span className="text-sm">{format(d, "dd")}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 md:max-w-2xl md:px-8">
        <div className="relative">
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="w-full appearance-none rounded-[11px] border border-[var(--dash-border-input)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--dash-text)]"
          >
            <option value="all">Todos os técnicos</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-[var(--dash-text)]">{stops.length} serviços</span>
          <span className="text-[var(--dash-text-muted)]">{completed} concluídos</span>
        </div>

        <div className="mt-3 space-y-2.5">
          {isLoading && <p className="text-sm text-[var(--dash-text-muted)]">Carregando...</p>}
          {!isLoading && stops.length === 0 && (
            <div className="rounded-[14px] border-2 border-dashed border-[var(--dash-border)] py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-[var(--dash-text-muted)]" />
              <p className="mt-2 text-sm text-[var(--dash-text-muted)]">Nenhuma rota neste dia.</p>
            </div>
          )}
          {stops.map((s, i) =>
            singleRoute ? (
              <Link key={s.id} to={`/rotas/${singleRoute.id}`}>
                <StopTimelineItem stop={s} index={i} />
              </Link>
            ) : (
              <StopTimelineItem key={s.id} stop={s} index={i} />
            ),
          )}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
