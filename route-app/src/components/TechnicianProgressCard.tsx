export function TechnicianProgressCard({
  name,
  completed,
  total,
}: {
  name: string;
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold text-[var(--dash-text)]">{name}</div>
          <div className="text-[12px] text-[var(--dash-text-muted-2)]">
            {completed} de {total} paradas concluídas
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}
        >
          Em Rota
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--dash-bg)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--dash-green)" }} />
      </div>
    </div>
  );
}
