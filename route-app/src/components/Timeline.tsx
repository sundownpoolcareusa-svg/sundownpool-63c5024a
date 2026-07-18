import { CheckCircle2, Circle, Loader2, ChevronDown } from "lucide-react";
import type { Stop } from "@/components/StopListItem";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4" style={{ color: "var(--dash-green)" }} />;
  if (status === "current") return <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--dash-blue,#2563EB)" }} />;
  return <Circle className="h-4 w-4" style={{ color: "var(--dash-text-muted)" }} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    completed: { label: "Completed", bg: "#E3F5EB", fg: "#137A46" },
    current: { label: "In Progress", bg: "var(--dash-water-bg)", fg: "var(--dash-water-icon)" },
    upcoming: { label: "Upcoming", bg: "var(--dash-bg)", fg: "var(--dash-text-secondary-2)" },
  };
  const s = map[status] ?? map.upcoming;
  return (
    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export function Timeline({
  stops,
  selectedStopId,
  onSelect,
}: {
  stops: Stop[];
  selectedStopId?: string;
  onSelect: (stop: Stop) => void;
}) {
  return (
    <div className="space-y-2">
      {stops.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors"
          style={{
            borderColor: s.id === selectedStopId ? "var(--dash-navy)" : "var(--dash-border)",
            background: s.id === selectedStopId ? "var(--dash-water-bg)" : "var(--dash-surface)",
          }}
        >
          <div className="flex flex-col items-center pt-0.5">
            <StatusIcon status={s.status} />
            {i < stops.length - 1 && <div className="mt-1 h-8 w-px bg-[var(--dash-border)]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-bold text-[var(--dash-text)]">
                {s.order}. {s.scheduledTime}
              </span>
            </div>
            <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{s.clientName}</div>
            <div className="truncate text-[12px] text-[var(--dash-text-muted-2)]">{s.address}</div>
            {s.serviceType === "Pool Service" && (
              <div className="mt-0.5 text-[11px] font-semibold text-[var(--dash-water-icon)]">💧 Pool Service</div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={s.status} />
            <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
          </div>
        </button>
      ))}
    </div>
  );
}
