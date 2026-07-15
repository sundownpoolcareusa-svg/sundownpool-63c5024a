import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Phone, ChevronUp, ChevronDown, Check, Play } from "lucide-react";
import { toast } from "sonner";
import { getRoute, listRouteStops, reorderStops, updateStopStatus, type RouteStop, type StopStatus } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TechnicianAvatar } from "@/components/TechnicianAvatar";

function nextStatus(status: StopStatus): StopStatus | null {
  if (status === "Pendente") return "Em serviço";
  if (status === "Em serviço") return "Concluído";
  return null;
}

export function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const qc = useQueryClient();

  const { data: route } = useQuery({ queryKey: ["route", routeId], queryFn: () => getRoute(routeId!), enabled: !!routeId });
  const { data: stops = [] } = useQuery({ queryKey: ["route-stops", routeId], queryFn: () => listRouteStops(routeId!), enabled: !!routeId });

  const statusMut = useMutation({
    mutationFn: ({ stop, status }: { stop: RouteStop; status: StopStatus }) => updateStopStatus(stop.id, status, stop.client_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops", routeId] });
      qc.invalidateQueries({ queryKey: ["today-stats"] });
      qc.invalidateQueries({ queryKey: ["next-stop"] });
      qc.invalidateQueries({ queryKey: ["tech-progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderStops(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-stops", routeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function move(index: number, dir: -1 | 1) {
    const next = [...stops];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMut.mutate(next.map((s) => s.id));
  }

  const completed = stops.filter((s) => s.status === "Concluído").length;

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="Detalhes da Rota" action="Editar" />

      {route?.technician && (
        <div className="flex items-center gap-3 border-b border-[var(--dash-border)] bg-white px-4 py-4">
          <TechnicianAvatar name={route.technician.name} color={route.technician.color} size={44} />
          <div>
            <div className="font-bold text-[var(--dash-text)]">{route.technician.name}</div>
            <div className="text-xs text-[var(--dash-text-muted)]">
              {stops.length} serviços • <span style={{ color: "var(--dash-green)" }}>{completed} concluídos</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2.5 px-4 py-4">
        {stops.map((stop, i) => {
          const next = nextStatus(stop.status);
          return (
            <div key={stop.id} className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: stop.status === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[var(--dash-text)]">{stop.scheduled_time ? stop.scheduled_time.slice(0, 5) : "—"}</div>
                    <StatusBadge status={stop.status} />
                  </div>
                  <div className="mt-1 truncate font-semibold text-[var(--dash-text)]">{stop.client?.name}</div>
                  <div className="truncate text-xs text-[var(--dash-text-muted)]">{stop.client?.address}</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[var(--dash-border)] text-[var(--dash-text-muted)] disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {stop.client?.phone && (
                  <a href={`tel:${stop.client.phone}`} className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-navy)]">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {next && (
                  <button
                    onClick={() => statusMut.mutate({ stop, status: next })}
                    disabled={statusMut.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[10px] py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                  >
                    {next === "Concluído" ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {next === "Concluído" ? "Concluir" : "Iniciar serviço"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {stops.length === 0 && <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Nenhum serviço nesta rota.</p>}
      </div>

      <div className="px-4 pb-4">
        <button
          disabled
          title="Em breve"
          className="w-full rounded-[11px] py-3 text-sm font-semibold text-white opacity-50"
          style={{ background: "var(--dash-navy)" }}
        >
          Otimizar Rota (em breve)
        </button>
      </div>
    </div>
  );
}
