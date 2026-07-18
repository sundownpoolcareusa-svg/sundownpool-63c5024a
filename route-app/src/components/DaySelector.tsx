const WEEKDAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildWeek(anchor: Date) {
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function DaySelector({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const week = buildWeek(selected);
  const today = new Date();

  return (
    <div className="flex items-center justify-between gap-1.5">
      {week.map((d) => {
        const active = d.toDateString() === selected.toDateString();
        const isToday = d.toDateString() === today.toDateString();
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            className="flex w-10 flex-col items-center gap-1 rounded-xl py-2 transition-colors"
            style={{
              background: active ? "var(--dash-navy)" : "transparent",
              color: active ? "#fff" : "var(--dash-text-secondary-2)",
            }}
          >
            <span className="text-[11px] font-semibold opacity-80">{WEEKDAY[d.getDay()]}</span>
            <span className="relative text-[13px] font-bold">
              {d.getDate()}
              {isToday && !active && (
                <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--dash-navy)]" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
