import { Printer, Send, RefreshCcw, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const actions = [
  { label: "Notificar clientes", icon: Send },
  { label: "Reatribuir rota", icon: RefreshCcw },
  { label: "Imprimir rota", icon: Printer },
  { label: "Concluir tudo", icon: CheckCheck },
];

export function RouteNotesQuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Notas da rota</h3>
        <textarea
          rows={4}
          placeholder="Ex: cliente pediu para pular a parada 6 esta semana..."
          className="w-full resize-none rounded-xl border border-[var(--dash-border-input,var(--dash-border))] bg-[var(--dash-surface-soft)] p-2.5 text-[13px] text-[var(--dash-text)] outline-none focus:border-[var(--dash-navy)]"
        />
      </div>
      <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4">
        <h3 className="mb-2 text-[13px] font-bold text-[var(--dash-text)]">Ações rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => toast.info(`${a.label} — em breve`)}
                className="flex items-center gap-2 rounded-xl border border-[var(--dash-border)] px-2.5 py-2 text-[12px] font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
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
