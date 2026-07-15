import type { StopStatus } from "@/lib/db";

const STYLES: Record<StopStatus, { bg: string; text: string }> = {
  "Pendente": { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" },
  "Em serviço": { bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" },
  "Concluído": { bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" },
};

export function StatusBadge({ status }: { status: StopStatus }) {
  const s = STYLES[status] ?? STYLES["Pendente"];
  return (
    <span
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: s.bg, color: s.text }}
    >
      {status}
    </span>
  );
}
