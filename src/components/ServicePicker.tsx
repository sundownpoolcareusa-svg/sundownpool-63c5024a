import { useQuery } from "@tanstack/react-query";
import { ensureDefaultServices, type Service } from "@/lib/db";

export function ServicePicker({ onPick }: { onPick: (service: Service) => void }) {
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: ensureDefaultServices });

  if (services.length === 0) return null;

  return (
    <select
      value=""
      onChange={(e) => {
        const service = services.find((s) => s.id === e.target.value);
        if (service) onPick(service);
        e.target.value = "";
      }}
      className="rounded-[10px] border border-[var(--dash-border-input)] px-2 py-1.5 text-xs font-semibold text-[var(--dash-text-secondary)]"
    >
      <option value="">+ Serviço salvo...</option>
      {services.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
