import type { LucideIcon } from "lucide-react";

export type SummaryCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tint: string;
};

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4"
          >
            <div
              className="mb-2 grid h-9 w-9 place-items-center rounded-[10px]"
              style={{ background: `${c.tint}1A`, color: c.tint }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--dash-text)]">{c.value}</div>
            <div className="text-[12px] font-medium text-[var(--dash-text-muted-2)]">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}
