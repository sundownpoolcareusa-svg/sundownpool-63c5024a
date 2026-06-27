import { Droplet } from "lucide-react";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-sky-50">
          <Droplet className="h-8 w-8 fill-sky-400 text-sky-500" />
        </div>
        <div className="leading-tight">
          <div className="text-xl font-extrabold tracking-wide text-[var(--brand-blue)]">AQUA CLEAR</div>
          <div className="text-[10px] font-semibold tracking-[0.25em] text-[var(--brand-blue)]/70">POOL SERVICES</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-3xl font-extrabold tracking-wider text-[var(--brand-blue)]">{title}</div>
        <div className="text-sm font-semibold text-[var(--brand-blue)]">{number}</div>
      </div>
    </div>
  );
}
