import { Plus, ListOrdered, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";

const actions = [
  { label: "Add Stop", icon: Plus },
  { label: "Reorder Stops", icon: ListOrdered },
  { label: "Send to Technician", icon: Send },
];

export function RouteNotesQuickActions({ notes }: { notes: string[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Route Notes</h3>
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n} className="flex items-start gap-2 text-[13px] text-[var(--dash-text-secondary)]">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
              {n}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => toast.info(`${a.label} — coming soon`)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--dash-border)] px-2 py-3 text-center text-[11px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
              >
                <Icon className="h-4 w-4" /> {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
