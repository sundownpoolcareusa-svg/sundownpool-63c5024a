import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail } from "lucide-react";
import { getClient, fmtDate } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { TechnicianAvatar } from "@/components/TechnicianAvatar";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-[var(--dash-text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--dash-text)]">{value}</span>
    </div>
  );
}

export function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => getClient(clientId!), enabled: !!clientId });

  if (!client) return null;

  return (
    <div className="min-h-screen pb-8">
      <PageHeader
        title="Detalhes do Cliente"
        action={<button onClick={() => navigate(`/clientes/${clientId}/editar`)}>Editar</button>}
      />

      <div className="flex items-center gap-3 border-b border-[var(--dash-border)] bg-white px-4 py-4">
        <TechnicianAvatar name={client.name} size={44} />
        <div>
          <div className="font-bold text-[var(--dash-text)]">{client.name}</div>
          <div className="text-xs text-[var(--dash-text-muted)]">{client.address}</div>
        </div>
      </div>

      <div className="space-y-2.5 p-4">
        {client.phone && (
          <a href={`tel:${client.phone}`} className="flex items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5">
            <Phone className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
            <span className="text-sm font-semibold text-[var(--dash-text)]">{client.phone}</span>
          </a>
        )}
        {client.email && (
          <a href={`mailto:${client.email}`} className="flex items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5">
            <Mail className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
            <span className="text-sm font-semibold text-[var(--dash-text)]">{client.email}</span>
          </a>
        )}

        <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">
            Informações da Piscina
          </div>
          <Row label="Tipo" value={client.client_type || "—"} />
          <Row label="Capacidade" value={client.pool_capacity_gallons ? `${client.pool_capacity_gallons} gal` : "—"} />
          <Row label="Tipo de filtro" value={client.pool_filter_type || "—"} />
          <Row label="Último serviço" value={fmtDate(client.last_service_date)} />
          <Row label="Frequência" value={client.service_frequency || "—"} />
        </div>

        <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">
            Observações
          </div>
          <p className="text-sm text-[var(--dash-text)]">{client.notes || "—"}</p>
        </div>
      </div>
    </div>
  );
}
