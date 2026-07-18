import { Phone, Navigation } from "lucide-react";

export type Stop = {
  id: string;
  order: number;
  clientName: string;
  address: string;
  area: string;
  phone: string;
  scheduledTime: string;
  status: string;
  poolType?: string;
  serviceType?: string;
  notes?: string;
};

function navigateUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function statusBadge(status: string) {
  if (status === "current") return { label: "Em andamento", bg: "var(--dash-water-bg)", fg: "var(--dash-water-icon)" };
  if (status === "completed") return { label: "Concluído", bg: "#E3F5EB", fg: "#137A46" };
  return { label: "Próxima", bg: "var(--dash-bg)", fg: "var(--dash-text-secondary-2)" };
}

export function StopRow({ stop, highlighted = false }: { stop: Stop; highlighted?: boolean }) {
  const badge = statusBadge(stop.status);
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{
        borderColor: highlighted ? "var(--dash-navy-2)" : "var(--dash-border)",
        background: highlighted ? "var(--dash-water-bg)" : "var(--dash-surface)",
      }}
    >
      <div
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: stop.status === "completed" ? "var(--dash-green)" : stop.status === "current" ? "var(--dash-blue,#2563EB)" : "var(--dash-text-muted)" }}
      >
        {stop.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[var(--dash-text)]">{stop.scheduledTime}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badge.bg, color: badge.fg }}>
            {badge.label}
          </span>
        </div>
        <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{stop.clientName}</div>
        <div className="truncate text-[12px] text-[var(--dash-text-muted-2)]">{stop.address}</div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <a
          href={`tel:${stop.phone.replace(/[^\d+]/g, "")}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]"
        >
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={navigateUrl(stop.address)}
          target="_blank"
          rel="noreferrer"
          className="grid h-9 w-9 place-items-center rounded-full text-white"
          style={{ background: "var(--dash-navy)" }}
        >
          <Navigation className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
