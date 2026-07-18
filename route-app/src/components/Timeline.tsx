import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Stop } from "@/components/StopListItem";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4" style={{ color: "var(--dash-green)" }} />;
  if (status === "current") return <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--dash-blue)" }} />;
  return <Circle className="h-4 w-4" style={{ color: "var(--dash-text-muted)" }} />;
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
                {s.order}. {s.clientName}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-[var(--dash-text-secondary-2)]">{s.scheduledTime}</span>
            </div>
            <div className="truncate text-[12px] text-[var(--dash-text-muted-2)]">{s.address}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
