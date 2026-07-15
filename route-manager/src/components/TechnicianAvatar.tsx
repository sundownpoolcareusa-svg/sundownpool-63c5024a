import { initials } from "@/lib/db";

export function TechnicianAvatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ width: size, height: size, background: color || "var(--dash-navy)" }}
    >
      {initials(name)}
    </div>
  );
}
