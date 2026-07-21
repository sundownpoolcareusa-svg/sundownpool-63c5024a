import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  X, MapPin, Phone, Clock, FlaskConical, TestTube, FileText, Camera, Wrench, CheckCircle2, Filter, CalendarDays, CalendarPlus,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { PhotoUploader } from "@/components/PhotoUploader";
import {
  getMyClientInvoices, getMyClientVisitHistory, updateMyClientPoolPhotos, updateMyClientEquipment,
  fmt, fmtDate, initials,
  type TechnicianClient, type ClientVisitHistoryEntry,
} from "@/lib/db";
import { formatPhone } from "@/lib/pdf";
import { toast } from "sonner";

const avatarColors = [
  "bg-sky-200 text-sky-800", "bg-orange-200 text-orange-800", "bg-purple-200 text-purple-800",
  "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800", "bg-green-200 text-green-800",
];

function nameHash(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function clientFullAddress(c: TechnicianClient) {
  return [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
}

type SubView = "history" | "invoices" | "photos" | "equipment" | null;

export function TecnicoClientDetail({
  client, onClose, todayStopId, onCompleteService,
}: {
  client: TechnicianClient | null;
  onClose: () => void;
  todayStopId: string | null;
  onCompleteService: () => void;
}) {
  const [subView, setSubView] = useState<SubView>(null);

  if (!client) return null;
  const address = clientFullAddress(client);

  function needsTodayStop() {
    toast.info("Só disponível no dia da visita agendada");
  }

  function completeService() {
    if (!todayStopId) {
      toast.info("Sem visita agendada hoje para este cliente");
      return;
    }
    onCompleteService();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
        <div className="relative pt-2.5">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
          <button onClick={onClose} className="absolute right-4 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className={`grid h-16 w-16 place-items-center rounded-full text-xl font-bold ${avatarColors[nameHash(client.name) % avatarColors.length]}`}>
                {initials(client.name)}
              </div>
              {client.status === "Ativo" && (
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-[var(--dash-green)]" />
              )}
            </div>
            <div className="min-w-0 pt-1">
              <div className="text-xl font-extrabold text-[var(--dash-text)]">{client.name}</div>
              <div className="text-[13px] text-[var(--dash-text-muted)]">{client.client_type}</div>
              {address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-start gap-1.5 text-[13px] text-[var(--dash-text-secondary)]"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {address}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--dash-text-secondary)]">
                  <Phone className="h-3.5 w-3.5" style={{ color: "var(--dash-navy)" }} /> {formatPhone(client.phone)}
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <DetailRow
              icon={Clock} bg="#FEF3C7" fg="#B45309"
              title="Visit History" subtitle="View past visits and service history"
              onClick={() => setSubView("history")}
            />

            {todayStopId ? (
              <Link to="/tecnico/chemicals/$stopId" params={{ stopId: todayStopId }} onClick={onClose}>
                <DetailRow
                  icon={FlaskConical} bg="#EDE4FB" fg="#7C3AED"
                  title="Chemistry Readings" subtitle="View and add pool chemical readings"
                />
              </Link>
            ) : (
              <DetailRow
                icon={FlaskConical} bg="#EDE4FB" fg="#7C3AED"
                title="Chemistry Readings" subtitle="View and add pool chemical readings"
                onClick={needsTodayStop}
              />
            )}

            {todayStopId ? (
              <Link to="/tecnico/chemicals/$stopId" params={{ stopId: todayStopId }} onClick={onClose}>
                <DetailRow
                  icon={TestTube} bg="#DCFCE7" fg="#16A34A"
                  title="Products Used" subtitle="Record chemicals and products used"
                />
              </Link>
            ) : (
              <DetailRow
                icon={TestTube} bg="#DCFCE7" fg="#16A34A"
                title="Products Used" subtitle="Record chemicals and products used"
                onClick={needsTodayStop}
              />
            )}

            <DetailRow
              icon={FileText} bg="#EDE4FB" fg="#7C3AED"
              title="Invoices" subtitle="View invoice history and status"
              onClick={() => setSubView("invoices")}
            />
            <DetailRow
              icon={Camera} bg="#FFEDD5" fg="#C2410C"
              title="Photos" subtitle="Add before & after photos"
              onClick={() => setSubView("photos")}
            />
            <DetailRow
              icon={Wrench} bg="#DBEAFE" fg="#2563EB"
              title="Equipment" subtitle="Inspect and update equipment status"
              onClick={() => setSubView("equipment")}
            />
            <DetailRow
              icon={CheckCircle2} bg="#FEE2E2" fg="#DC2626"
              title="Complete Service" subtitle="Mark this visit as complete"
              danger
              onClick={completeService}
            />
          </div>
        </div>
      </div>

      <Modal open={subView === "history"} onClose={() => setSubView(null)} title="Visit History">
        <ClientHistoryList client={client} />
      </Modal>
      <Modal open={subView === "invoices"} onClose={() => setSubView(null)} title="Invoices" maxWidth="max-w-lg">
        <ClientInvoicesList clientId={client.client_id} />
      </Modal>
      <Modal open={subView === "photos"} onClose={() => setSubView(null)} title="Photos" maxWidth="max-w-lg">
        <ClientPhotosEditor client={client} />
      </Modal>
      <Modal open={subView === "equipment"} onClose={() => setSubView(null)} title="Equipment" maxWidth="max-w-lg">
        <ClientEquipmentEditor client={client} />
      </Modal>
    </>
  );
}

function DetailRow({
  icon: Icon, bg, fg, title, subtitle, danger, onClick,
}: { icon: typeof Clock; bg: string; fg: string; title: string; subtitle: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[16px] border border-[var(--dash-border)] bg-white p-3.5 text-left"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: bg, color: fg }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold" style={{ color: danger ? "var(--dash-red)" : "var(--dash-text)" }}>{title}</div>
        <div className="truncate text-[12.5px] text-[var(--dash-text-muted)]">{subtitle}</div>
      </div>
      <span className="text-[var(--dash-text-muted)]">›</span>
    </button>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null;
  const fmtT = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return end ? `${fmtT(start)} – ${fmtT(end)}` : fmtT(start);
}

function StatCell({ icon: Icon, bg, fg, value, label }: { icon: typeof Clock; bg: string; fg: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: bg, color: fg }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-lg font-extrabold text-[var(--dash-text)]">{value}</div>
      <div className="text-[11px] text-[var(--dash-text-muted)]">{label}</div>
    </div>
  );
}

function VisitRow({ visit }: { visit: ClientVisitHistoryEntry }) {
  const d = new Date(`${visit.route_date}T00:00:00`);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = d.getFullYear();
  const timeRange = formatTimeRange(visit.started_at, visit.completed_at);
  const isCompleted = visit.status === "Concluído";
  const isMissed = !isCompleted && visit.route_date < todayStr();
  const statusLabel = isCompleted ? "Completed" : isMissed ? "Missed" : "Pending";
  const statusColor = isCompleted ? "var(--dash-green)" : isMissed ? "var(--dash-red)" : "var(--dash-text-muted-2)";

  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-[var(--dash-border)] p-3">
      <div className="w-14 shrink-0 text-center">
        <div className="text-[11px] font-bold" style={{ color: "#4F46E5" }}>{weekday}</div>
        <div className="text-[15px] font-extrabold text-[var(--dash-text)]">{monthDay}</div>
        <div className="text-[11px] text-[var(--dash-text-muted)]">{year}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: statusColor }}>
          {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {statusLabel}
        </div>
        {timeRange && (
          <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--dash-text-secondary)]">
            <Clock className="h-3.5 w-3.5 shrink-0" /> {timeRange}
          </div>
        )}
        {visit.notes && (
          <div className="mt-1 flex items-start gap-1.5 text-[12px] text-[var(--dash-text-muted)]">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {visit.notes}
          </div>
        )}
      </div>
      <span className="mt-1 text-[var(--dash-text-muted)]">›</span>
    </div>
  );
}

function ClientHistoryList({ client }: { client: TechnicianClient }) {
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["my-client-visit-history", client.client_id],
    queryFn: () => getMyClientVisitHistory(client.client_id),
  });
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Loading...</p>;

  const address = clientFullAddress(client);
  const totalVisits = visits.length;
  const completed = visits.filter((v) => v.status === "Concluído").length;
  const missed = visits.filter((v) => v.status !== "Concluído" && v.route_date < todayStr()).length;
  const visible = showAll ? visits : visits.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold ${avatarColors[nameHash(client.name) % avatarColors.length]}`}>
            {initials(client.name)}
          </div>
          <div>
            <div className="font-bold text-[var(--dash-text)]">{client.name}</div>
            <div className="text-[12px] text-[var(--dash-text-muted)]">{client.client_type}</div>
            {address && (
              <div className="mt-1 flex items-start gap-1 text-[12px] text-[var(--dash-text-secondary)]">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--dash-navy)" }} /> {address}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => toast.info("Filters — coming soon")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {visits.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">No visits recorded yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 divide-x divide-[var(--dash-border)] rounded-[14px] border border-[var(--dash-border)] bg-white py-3">
            <StatCell icon={CalendarDays} bg="#EDE4FB" fg="#7C3AED" value={totalVisits} label="Total Visits" />
            <StatCell icon={CheckCircle2} bg="#DCFCE7" fg="#16A34A" value={completed} label="Completed" />
            <StatCell icon={Clock} bg="#FEF3C7" fg="#B45309" value={missed} label="Missed" />
          </div>

          <div>
            <h3 className="mb-2 text-[15px] font-bold text-[var(--dash-text)]">Recent Visits</h3>
            <div className="space-y-2.5">
              {visible.map((v) => <VisitRow key={v.route_stop_id} visit={v} />)}
            </div>
          </div>

          {visits.length > 5 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--dash-border)] p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "#EDE4FB", color: "#7C3AED" }}>
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-[var(--dash-text)]">{showAll ? "Show Less" : "View Full History"}</div>
                <div className="text-[12px] text-[var(--dash-text-muted)]">See all visits and notes</div>
              </div>
              <span className="text-[var(--dash-text-muted)]">›</span>
            </button>
          )}
        </>
      )}

      <button
        onClick={() => toast.info("Add New Visit — coming soon")}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white"
        style={{ background: "#4F46E5" }}
      >
        <CalendarPlus className="h-4 w-4" /> Add New Visit
      </button>
    </div>
  );
}

function ClientInvoicesList({ clientId }: { clientId: string }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-client-invoices", clientId],
    queryFn: () => getMyClientInvoices(clientId),
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Carregando...</p>;
  if (invoices.length === 0) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Nenhuma fatura ainda.</p>;

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-[12px] border border-[var(--dash-border)] p-3">
          <div>
            <div className="text-sm font-bold text-[var(--dash-text)]">{inv.number}</div>
            <div className="text-[12px] text-[var(--dash-text-muted)]">{fmtDate(inv.invoice_date)}</div>
          </div>
          <div className="text-right">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: inv.status === "PAID" ? "var(--dash-badge-paid-bg)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-bg)" : "var(--dash-badge-unpaid-bg)",
                color: inv.status === "PAID" ? "var(--dash-badge-paid-text)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-text)" : "var(--dash-badge-unpaid-text)",
              }}
            >
              {inv.status}
            </span>
            <div className="mt-1 text-sm font-bold text-[var(--dash-text)]">{fmt(Number(inv.total))}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientPhotosEditor({ client }: { client: TechnicianClient }) {
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>(client.pool_photos ?? []);
  const saveMut = useMutation({
    mutationFn: (next: string[]) => updateMyClientPoolPhotos(client.client_id, next),
    onSuccess: () => {
      toast.success("Photos updated!");
      qc.invalidateQueries({ queryKey: ["my-technician-clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PhotoUploader
      label="Pool Photos"
      value={photos}
      onChange={(next) => { setPhotos(next); saveMut.mutate(next); }}
      folder={`client-${client.client_id}/pool`}
    />
  );
}

function ClientEquipmentEditor({ client }: { client: TechnicianClient }) {
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>(client.equipment_photos ?? []);
  const [notes, setNotes] = useState(client.equipment_notes ?? "");
  const saveMut = useMutation({
    mutationFn: () => updateMyClientEquipment(client.client_id, photos, notes),
    onSuccess: () => {
      toast.success("Equipment updated!");
      qc.invalidateQueries({ queryKey: ["my-technician-clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PhotoUploader
        label="Equipment Photos"
        value={photos}
        onChange={(next) => { setPhotos(next); saveMut.mutate(); }}
        folder={`client-${client.client_id}/equipment`}
      />
      <div>
        <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. pump making noise, filter OK..."
          className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--dash-navy)] py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saveMut.isPending ? "Saving..." : "Save Notes"}
      </button>
    </div>
  );
}
