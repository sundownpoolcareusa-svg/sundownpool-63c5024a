import { ChevronRight } from "lucide-react";

export function TechnicianProgressCard({
  name,
  initials,
  color,
  completed,
  total,
  onClick,
}: {
  name: string;
  initials: string;
  color: string;
  completed: number;
  total: number;
  onClick?: () => void;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 text-left">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: color }}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--dash-text)]">{name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
          >
            Em Rota
          </span>
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--dash-text-muted-2)]">
          {total} paradas · {completed} concluídas
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--dash-bg)]">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--dash-green)" }} />
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">{pct}%</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
    </button>
  );
}
