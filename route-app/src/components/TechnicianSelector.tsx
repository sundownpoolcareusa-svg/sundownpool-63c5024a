export type Technician = {
  id: string;
  name: string;
  color: string;
  van: string;
  stats: { total: number; completed: number; timeLeft: string; distance: string };
};

export function TechnicianSelector({
  technicians,
  selectedId,
  onSelect,
}: {
  technicians: Technician[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {technicians.map((t) => {
        const active = t.id === selectedId;
        const pct = t.stats.total > 0 ? Math.round((t.stats.completed / t.stats.total) * 100) : 0;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex min-w-[190px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors"
            style={{
              borderColor: active ? "var(--dash-navy)" : "var(--dash-border)",
              background: active ? "var(--dash-water-bg)" : "var(--dash-surface)",
            }}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: t.color }}>
              {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{t.name}</div>
              <div className="text-[11px] text-[var(--dash-text-muted-2)]">
                {t.stats.total} stops · {t.stats.completed} done
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
