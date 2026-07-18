import { Droplets, Clock } from "lucide-react";
import type { Stop } from "@/components/StopListItem";

export function CurrentStopDetail({ stop, onViewDetails }: { stop: Stop; onViewDetails?: () => void }) {
  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ background: stop.status === "completed" ? "var(--dash-green)" : "var(--dash-blue,#2563EB)" }}
        >
          {stop.order}
        </span>
        <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--dash-text-muted-2)]">Current Stop</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[16px] font-extrabold text-[var(--dash-text)]">{stop.clientName}</div>
          <div className="text-[13px] text-[var(--dash-text-secondary-2)]">{stop.address}</div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">
              <Droplets className="h-3.5 w-3.5" /> Service Type
            </div>
            <div className="text-[13px] font-bold text-[var(--dash-text)]">{stop.serviceType ?? "Weekly Service"}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--dash-text-muted-2)]">
              <Clock className="h-3.5 w-3.5" /> Est. Duration
            </div>
            <div className="text-[13px] font-bold text-[var(--dash-text)]">45 min</div>
          </div>

          <button
            onClick={onViewDetails}
            className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-white"
            style={{ background: "var(--dash-navy)" }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
