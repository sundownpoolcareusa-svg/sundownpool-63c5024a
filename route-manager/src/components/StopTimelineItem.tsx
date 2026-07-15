import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { RouteStop } from "@/lib/db";

export function StopTimelineItem({ stop, index, showPhone = false }: { stop: RouteStop; index: number; showPhone?: boolean }) {
  const client = stop.client;
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
      <div
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: stop.status === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
      >
        {index + 1}
      </div>
      <Link to={`/clientes/${client?.id}`} className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-[var(--dash-text)]">
            {stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}
          </div>
          <StatusBadge status={stop.status} />
        </div>
        <div className="mt-1 truncate font-semibold text-[var(--dash-text)]">{client?.name ?? "Cliente"}</div>
        <div className="truncate text-xs text-[var(--dash-text-muted)]">{client?.address ?? ""}</div>
      </Link>
      {showPhone && client?.phone && (
        <a
          href={`tel:${client.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-navy)]"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
