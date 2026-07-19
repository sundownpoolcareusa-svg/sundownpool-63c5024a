import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo } from "@/components/AppLogo";
import {
  ChevronLeft, ChevronRight, Phone, Navigation, Play, Check, FlaskConical, LogOut, MapPin,
} from "lucide-react";
import { getMyTechnician, getMyTechnicianStops, updateMyStopStatus, type StopStatus, type TechnicianStop } from "@/lib/db";
import { formatPhone } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/tecnico")({
  component: TecnicoPage,
});

const STATUS_STYLES: Record<StopStatus, { bg: string; text: string }> = {
  "Pendente": { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" },
  "Em serviço": { bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" },
  "Concluído": { bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" },
};

function statusMarkerColor(status: StopStatus) {
  if (status === "Concluído") return "#16A34A";
  if (status === "Em serviço") return "#2563EB";
  return "#94A3B8";
}

function nextStatus(status: StopStatus): StopStatus | null {
  if (status === "Pendente") return "Em serviço";
  if (status === "Em serviço") return "Concluído";
  return null;
}

function stopStatusLabel(status: StopStatus) {
  return status === "Em serviço" ? "Em andamento" : status === "Concluído" ? "Concluído" : "Pendente";
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function stopAddress(stop: TechnicianStop) {
  return [stop.client_address, stop.client_city, stop.client_state, stop.client_zip].filter(Boolean).join(", ");
}

function TecnicoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checkedSession, setCheckedSession] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const dateStr = toDateStr(date);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const technician = await getMyTechnician();
      if (!technician) {
        navigate({ to: "/invoice" });
        return;
      }
      setCheckedSession(true);
    })();
  }, [navigate]);

  const { data: technician } = useQuery({ queryKey: ["my-technician"], queryFn: getMyTechnician, enabled: checkedSession });
  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["my-technician-stops", dateStr],
    queryFn: () => getMyTechnicianStops(dateStr),
    enabled: checkedSession,
  });

  const statusMut = useMutation({
    mutationFn: ({ stopId, status }: { stopId: string; status: StopStatus }) => updateMyStopStatus(stopId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-technician-stops", dateStr] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!checkedSession) return null;

  const sorted = stops.slice().sort((a, b) => a.position - b.position);
  const completedCount = sorted.filter((s) => s.status === "Concluído").length;
  const dateLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--dash-border)] bg-white px-4 py-3">
        <AppLogo style={{ width: 124, height: 32 }} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--dash-text)]">{technician?.name}</span>
          <button onClick={signOut} title="Sair" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md p-4">
        <div className="flex items-center justify-between rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
          <button onClick={() => setDate((d) => new Date(d.getTime() - 86400000))} className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="text-[13px] font-bold capitalize text-[var(--dash-text)]">{dateLabel}</div>
            <div className="text-[11px] text-[var(--dash-text-muted)]">{completedCount} de {sorted.length} concluídas</div>
          </div>
          <button onClick={() => setDate((d) => new Date(d.getTime() + 86400000))} className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>
          ) : sorted.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white py-14 text-center">
              <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--dash-text-secondary)]">Nenhuma parada neste dia</p>
            </div>
          ) : (
            sorted.map((stop) => {
              const badgeStyle = STATUS_STYLES[stop.status] ?? STATUS_STYLES["Pendente"];
              const next = nextStatus(stop.status);
              const address = stopAddress(stop);
              return (
                <div key={stop.stop_id} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: statusMarkerColor(stop.status) }}>
                      {stop.position + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[var(--dash-text)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badgeStyle.bg, color: badgeStyle.text }}>
                          {stopStatusLabel(stop.status)}
                        </span>
                        {stop.has_chemicals && <FlaskConical className="h-3.5 w-3.5" style={{ color: "var(--dash-green)" }} />}
                      </div>
                      <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">{stop.client_name}</div>
                      {address ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[12px] text-[var(--dash-text-muted-2)] underline decoration-dotted underline-offset-2"
                        >
                          {stop.client_address}
                        </a>
                      ) : (
                        <span className="text-[12px] text-[var(--dash-text-muted-2)]">—</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {stop.client_phone && (
                      <a href={`tel:${stop.client_phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--dash-border)] py-2 text-[12px] font-semibold text-[var(--dash-text-secondary)]">
                        <Phone className="h-3.5 w-3.5" /> {formatPhone(stop.client_phone)}
                      </a>
                    )}
                    {address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--dash-border)] px-3 py-2 text-[12px] font-semibold text-[var(--dash-text-secondary)]"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {next && (
                      <button
                        onClick={() => statusMut.mutate({ stopId: stop.stop_id, status: next })}
                        disabled={statusMut.isPending}
                        className="flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                        style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                      >
                        {next === "Concluído" ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {next === "Concluído" ? "Concluir" : "Iniciar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
