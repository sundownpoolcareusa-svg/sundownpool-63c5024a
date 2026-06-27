import { Droplet } from "lucide-react";

export function AppLogo({ variant = "light" }: { variant?: "light" | "dark" }) {
  const titleColor = variant === "light" ? "text-white" : "text-[var(--brand-blue)]";
  const subColor = variant === "light" ? "text-sky-200" : "text-[var(--brand-blue)]/70";
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10">
        <Droplet className="h-7 w-7 fill-sky-400 text-sky-300" />
      </div>
      <div className="leading-tight">
        <div className={`text-xl font-extrabold tracking-wide ${titleColor}`}>AQUA CLEAR</div>
        <div className={`text-[11px] font-semibold tracking-[0.2em] ${subColor}`}>POOL SERVICES</div>
      </div>
    </div>
  );
}
