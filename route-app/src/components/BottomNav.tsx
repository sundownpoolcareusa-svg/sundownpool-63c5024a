import { Map, CalendarDays, Plus, Users, Menu } from "lucide-react";

const TABS = [
  { key: "rota", label: "Rota", icon: Map },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "add", label: "", icon: Plus },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "mais", label: "Mais", icon: Menu },
] as const;

export function BottomNav({ active = "rota" }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--dash-border)] bg-[var(--dash-surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {TABS.map((t) => {
          const Icon = t.icon;
          if (t.key === "add") {
            return (
              <button
                key={t.key}
                className="-mt-6 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg"
                style={{ background: "var(--dash-navy)" }}
                title="Adicionar parada"
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          }
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              className="flex flex-col items-center gap-1 px-3 py-1.5"
              style={{ color: isActive ? "var(--dash-navy)" : "var(--dash-text-muted)" }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
