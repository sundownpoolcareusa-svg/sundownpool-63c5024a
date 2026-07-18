import { Phone, Navigation, MapPin } from "lucide-react";

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
  notes?: string;
};

function navigateUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function NextStopCard({ stop }: { stop: Stop }) {
  return (
    <div
      className="rounded-2xl border-2 p-4 text-white shadow-md"
      style={{ background: "linear-gradient(135deg, var(--dash-navy) 0%, var(--dash-navy-2) 100%)", borderColor: "var(--dash-navy)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
          Próxima parada
        </span>
        <span className="text-[13px] font-bold">{stop.scheduledTime}</span>
      </div>
      <div className="text-lg font-extrabold">{stop.clientName}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-white/85">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span>{stop.address}</span>
      </div>
      {stop.notes && <div className="mt-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px]">{stop.notes}</div>}
      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${stop.phone.replace(/[^\d+]/g, "")}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-[13px] font-bold hover:bg-white/25"
        >
          <Phone className="h-4 w-4" /> Ligar
        </a>
        <a
          href={navigateUrl(stop.address)}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-bold"
          style={{ color: "var(--dash-navy)" }}
        >
          <Navigation className="h-4 w-4" /> Navegar
        </a>
      </div>
    </div>
  );
}

export function UpcomingStopRow({ stop }: { stop: Stop }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
        style={{ background: "var(--dash-text-muted)" }}
      >
        {stop.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{stop.clientName}</div>
        <div className="truncate text-[12px] text-[var(--dash-text-muted-2)]">{stop.area}</div>
      </div>
      <div className="shrink-0 text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">{stop.scheduledTime}</div>
    </div>
  );
}
