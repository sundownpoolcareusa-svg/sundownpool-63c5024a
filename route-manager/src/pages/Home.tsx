import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Menu, Bell, Navigation, Waves } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getNextStop, getTechnicianProgressToday, getTodayStats } from "@/lib/db";
import { TechnicianAvatar } from "@/components/TechnicianAvatar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Sidebar } from "@/components/Sidebar";

export function Home() {
  const { data: stats } = useQuery({ queryKey: ["today-stats"], queryFn: getTodayStats });
  const { data: nextStop } = useQuery({ queryKey: ["next-stop"], queryFn: getNextStop });
  const { data: progress = [] } = useQuery({ queryKey: ["tech-progress"], queryFn: getTechnicianProgressToday });

  const today = new Date();
  const dateLabel = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-60">
      <Sidebar />
      <header className="px-4 pb-6 pt-4 text-white md:hidden" style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))" }}>
        <div className="flex items-center justify-between">
          <button aria-label="Menu"><Menu className="h-6 w-6" /></button>
          <div className="flex items-center gap-2 text-lg font-extrabold">
            <Waves className="h-6 w-6" />
            Pool Route Manager
          </div>
          <button aria-label="Notificações" className="relative">
            <Bell className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--dash-navy)]" style={{ background: "var(--dash-orange)" }} />
          </button>
        </div>
        <div className="mt-5">
          <div className="text-xl font-extrabold">Olá, André!</div>
          <div className="text-sm capitalize text-white/70">{dateLabel}</div>
        </div>
      </header>

      <div className="hidden px-8 pb-2 pt-8 md:block">
        <div className="text-2xl font-extrabold text-[var(--dash-text)]">Olá, André!</div>
        <div className="text-sm capitalize text-[var(--dash-text-muted)]">{dateLabel}</div>
      </div>

      <main className="-mt-3 space-y-4 px-4 md:mt-0 md:max-w-3xl md:px-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] p-4 text-white" style={{ background: "var(--dash-navy)" }}>
            <div className="text-3xl font-extrabold">{stats?.total ?? "—"}</div>
            <div className="text-xs opacity-90">Serviços de hoje</div>
          </div>
          <div className="rounded-[16px] p-4 text-white" style={{ background: "var(--dash-green)" }}>
            <div className="text-3xl font-extrabold">{stats?.completed ?? "—"}</div>
            <div className="text-xs opacity-90">Concluídos hoje</div>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
          <div className="flex items-center justify-between">
            <div className="font-bold text-[var(--dash-text)]">Próximo serviço</div>
            {nextStop?.scheduled_time && (
              <div className="text-sm font-bold" style={{ color: "var(--dash-navy)" }}>{nextStop.scheduled_time.slice(0, 5)}</div>
            )}
          </div>
          {nextStop ? (
            <>
              <Link to={`/clientes/${nextStop.client?.id}`} className="mt-3 block">
                <div className="font-semibold text-[var(--dash-text)]">{nextStop.client?.name}</div>
                <div className="text-sm text-[var(--dash-text-muted)]">{nextStop.client?.address}</div>
              </Link>
              {nextStop.client?.lat && nextStop.client?.lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${nextStop.client.lat},${nextStop.client.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-[11px] py-2.5 text-sm font-semibold text-white"
                  style={{ background: "var(--dash-green)" }}
                >
                  <Navigation className="h-4 w-4" /> Iniciar navegação
                </a>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--dash-text-muted)]">Nenhum serviço pendente hoje.</p>
          )}
        </div>

        <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-bold text-[var(--dash-text)]">Técnicos</div>
            <Link to="/mais/tecnicos" className="text-xs font-semibold" style={{ color: "var(--dash-link)" }}>Ver todos</Link>
          </div>
          <div className="space-y-3">
            {progress.length === 0 && <p className="text-sm text-[var(--dash-text-muted)]">Nenhuma rota hoje.</p>}
            {progress.map((p) => (
              <div key={p.technician.id} className="flex items-center gap-3">
                <TechnicianAvatar name={p.technician.name} color={p.technician.color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-semibold text-[var(--dash-text)]">{p.technician.name}</span>
                    <span className="text-xs text-[var(--dash-text-muted)]">
                      {p.completed}/{p.total} concluídos
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dash-border-table)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.total ? (p.completed / p.total) * 100 : 0}%`, background: p.technician.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
