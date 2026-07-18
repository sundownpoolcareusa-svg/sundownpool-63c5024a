import { Phone, Navigation, MapPin, Droplets } from "lucide-react";
import type { Stop } from "@/components/StopListItem";

function navigateUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function CurrentStopDetail({ stop }: { stop: Stop }) {
  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--dash-text-muted-2)]">Parada selecionada</span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: stop.status === "current" ? "var(--dash-water-bg)" : "var(--dash-bg)",
            color: stop.status === "current" ? "var(--dash-water-icon)" : "var(--dash-text-secondary-2)",
          }}
        >
          {stop.status === "completed" ? "Concluído" : stop.status === "current" ? "Em serviço" : "Pendente"}
        </span>
      </div>

      <div className="text-lg font-extrabold text-[var(--dash-text)]">{stop.clientName}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--dash-text-secondary-2)]">
        <MapPin className="h-3.5 w-3.5 shrink-0" /> {stop.address}
      </div>
      {stop.poolType && (
        <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--dash-text-secondary-2)]">
          <Droplets className="h-3.5 w-3.5 shrink-0" /> {stop.poolType}
        </div>
      )}
      {stop.notes && (
        <div className="mt-3 rounded-lg bg-[var(--dash-bg)] px-3 py-2 text-[12px] text-[var(--dash-text-secondary)]">{stop.notes}</div>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${stop.phone.replace(/[^\d+]/g, "")}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--dash-border)] py-2 text-[13px] font-bold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
        >
          <Phone className="h-4 w-4" /> Ligar
        </a>
        <a
          href={navigateUrl(stop.address)}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold text-white"
          style={{ background: "var(--dash-navy)" }}
        >
          <Navigation className="h-4 w-4" /> Navegar
        </a>
      </div>
    </div>
  );
}
