import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  MapPin, Phone, Clock, FlaskConical, TestTube, FileText, Camera, Wrench, CheckCircle2, Filter, CalendarDays, CalendarPlus, Droplet, PlusCircle,
  ChevronLeft, MoreHorizontal, AlertTriangle, Pencil, Home, Building2, StickyNote,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { PhotoUploader } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyClientInvoices, getMyClientVisitHistory, getMyClientChemicalsHistory, updateMyClientPoolPhotos, updateMyClientEquipment,
  updateMyClientNotes, logMyClientFilterChange,
  fmt, fmtDate, initials, formatProductQty, CHEMICAL_READING_META,
  type TechnicianClient, type ClientVisitHistoryEntry, type ChemicalReadingKey,
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

function isCommercial(clientType: string) {
  return clientType.toLowerCase().startsWith("comm") || clientType.toLowerCase().startsWith("comer");
}

// Filter REPLACEMENT (media/cartridge change) is an annual task, distinct
// from the routine filter cleaning tracked per visit. No alert until the
// technician logs the first change — there's no real baseline before that.
function filterChangeDueDate(client: TechnicianClient): Date | null {
  if (!client.filter_last_changed_at) return null;
  const last = new Date(`${client.filter_last_changed_at}T00:00:00`);
  const due = new Date(last);
  due.setFullYear(due.getFullYear() + 1);
  return new Date() > due ? due : null;
}

// Circular photo showing the client's first pool photo (signed URL from the
// private "client-photos" bucket), falling back to a property-type icon in
// the same blue/purple scheme used on the "Meus Clientes" list.
function ClientPhoto({ client }: { client: TechnicianClient }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = client.pool_photos?.[0];
    if (!path) { setUrl(null); return; }
    let alive = true;
    supabase.storage.from("client-photos").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [client.pool_photos]);

  if (url) {
    return <img src={url} alt="" className="h-[130px] w-[100px] shrink-0 rounded-2xl object-cover" />;
  }
  const commercial = isCommercial(client.client_type);
  return (
    <div
      className="grid h-[130px] w-[100px] shrink-0 place-items-center rounded-2xl"
      style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "#DBEAFE", color: "#2563EB" }}
    >
      {commercial ? <Building2 className="h-9 w-9" /> : <Home className="h-9 w-9" />}
    </div>
  );
}

type SubView = "history" | "chemicals" | "products" | "invoices" | "photos" | "equipment" | null;

export function TecnicoClientDetail({
  client, onClose, todayStopId, onCompleteService,
}: {
  client: TechnicianClient | null;
  onClose: () => void;
  todayStopId: string | null;
  onCompleteService: () => void;
}) {
  const qc = useQueryClient();
  const [subView, setSubView] = useState<SubView>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [filterConfirmOpen, setFilterConfirmOpen] = useState(false);
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [filterLastChangedAt, setFilterLastChangedAt] = useState(client?.filter_last_changed_at ?? null);

  useEffect(() => {
    setNotes(client?.notes ?? "");
    setFilterLastChangedAt(client?.filter_last_changed_at ?? null);
  }, [client?.client_id]);

  const notesMut = useMutation({
    mutationFn: (next: string) => updateMyClientNotes(client!.client_id, next),
    onSuccess: (_data, next) => {
      setNotes(next);
      setNotesOpen(false);
      toast.success("Observações atualizadas!");
      qc.invalidateQueries({ queryKey: ["my-technician-clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filterChangeMut = useMutation({
    mutationFn: () => logMyClientFilterChange(client!.client_id),
    onSuccess: () => {
      setFilterLastChangedAt(new Date().toISOString().slice(0, 10));
      setFilterConfirmOpen(false);
      toast.success("Troca de filtro registrada!");
      qc.invalidateQueries({ queryKey: ["my-technician-clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!client) return null;
  const address = clientFullAddress(client);
  const commercial = isCommercial(client.client_type);
  const filterDue = filterChangeDueDate({ ...client, filter_last_changed_at: filterLastChangedAt });
  const noteLines = notes.split("\n").map((l) => l.trim()).filter(Boolean);

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

  const quickActions: { key: string; label: string; icon: typeof Clock; bg: string; fg: string; onClick: () => void }[] = [
    { key: "history", label: "Histórico", icon: Clock, bg: "#FEF3C7", fg: "#B45309", onClick: () => setSubView("history") },
    { key: "chemicals", label: "Químicos", icon: FlaskConical, bg: "#EDE4FB", fg: "#7C3AED", onClick: () => setSubView("chemicals") },
    { key: "products", label: "Produtos", icon: TestTube, bg: "#DCFCE7", fg: "#16A34A", onClick: () => setSubView("products") },
    { key: "invoices", label: "Faturas", icon: FileText, bg: "#EDE4FB", fg: "#7C3AED", onClick: () => setSubView("invoices") },
    { key: "photos", label: "Fotos", icon: Camera, bg: "#FFEDD5", fg: "#C2410C", onClick: () => setSubView("photos") },
    { key: "equipment", label: "Equipamento", icon: Wrench, bg: "#DBEAFE", fg: "#2563EB", onClick: () => setSubView("equipment") },
    { key: "complete", label: "Concluir", icon: CheckCircle2, bg: "#FEE2E2", fg: "#DC2626", onClick: completeService },
  ];

  return (
    <>
      <div className="dash fixed inset-0 z-50 overflow-y-auto bg-[var(--dash-bg)]">
        <header className="relative flex items-center justify-center border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-4">
          <button onClick={onClose} className="absolute left-4 text-[var(--dash-text-secondary)]">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Cliente</h1>
          <button onClick={() => toast.info("Em breve")} className="absolute right-4 text-[var(--dash-text-secondary)]">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto max-w-md space-y-4 p-4 pb-10">
          <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
            <div className="flex items-start gap-3">
              <ClientPhoto client={client} />
              <div className="flex min-w-0 flex-1 flex-col self-stretch">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                      style={commercial ? { background: "#EDE4FB", color: "#7C3AED" } : { background: "#DBEAFE", color: "#2563EB" }}
                    >
                      {commercial ? <Building2 className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate text-lg font-extrabold text-[var(--dash-text)]">{client.name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[13.5px] font-extrabold tabular-nums text-[var(--dash-text)]">{fmt(Number(client.monthly_value || 0))}</div>
                  </div>
                </div>

                <span
                  className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={client.status === "Ativo" ? { background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" } : { background: "var(--dash-border-table)", color: "var(--dash-text-muted-2)" }}
                >
                  {client.status === "Ativo" ? "Ativo" : "Inativo"}
                  {client.status === "Ativo" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--dash-green)]" />}
                </span>

                <div className="mt-2 space-y-1.5 text-[12.5px] text-[var(--dash-text-secondary)]">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {formatPhone(client.phone)}
                    </a>
                  )}
                  {address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-navy)" }} /> {address}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-extrabold text-[var(--dash-text)]">Ações rápidas</h2>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: "x proximity" }}>
              {quickActions.map((a) => (
                <button key={a.key} type="button" onClick={a.onClick} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-[var(--dash-border)] bg-white p-3" style={{ scrollSnapAlign: "start" }}>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: a.bg, color: a.fg }}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <span className="text-center text-[11px] font-bold leading-tight text-[var(--dash-text)]">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {filterDue && (
            <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
              <h2 className="mb-3 text-[15px] font-extrabold text-[var(--dash-text)]">Alertas</h2>
              <button
                type="button"
                onClick={() => setFilterConfirmOpen(true)}
                className="flex w-full items-center gap-3 rounded-[14px] p-3 text-left"
                style={{ background: "#FFF1E7" }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: "#FDE0C4", color: "#C2410C" }}>
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-[var(--dash-text)]">Trocar filtro</div>
                  <div className="text-[12px] text-[var(--dash-text-muted)]">Vencido desde {fmtDate(filterDue.toISOString().slice(0, 10))}</div>
                </span>
                <span className="text-[var(--dash-text-muted)]">›</span>
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Observações</h2>
              <button
                type="button"
                onClick={() => { setNotesDraft(notes); setNotesOpen(true); }}
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {noteLines.length === 0 ? (
              <p className="text-[13px] text-[var(--dash-text-muted)]">Nenhuma observação ainda.</p>
            ) : (
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--dash-bg)] text-[var(--dash-text-secondary)]">
                  <StickyNote className="h-4 w-4" />
                </span>
                <ul className="list-disc space-y-1 pl-4 text-[13.5px] text-[var(--dash-text-secondary)]">
                  {noteLines.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Observações" maxWidth="max-w-md">
        <div className="space-y-3">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={5}
            placeholder="Uma observação por linha..."
            className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
          <button
            onClick={() => notesMut.mutate(notesDraft)}
            disabled={notesMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--dash-navy)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {notesMut.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>

      <Modal open={filterConfirmOpen} onClose={() => setFilterConfirmOpen(false)} title="Trocar filtro" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--dash-text-secondary)]">Marcar o filtro deste cliente como trocado hoje? O próximo alerta será daqui a 1 ano.</p>
          <div className="flex gap-3">
            <button onClick={() => setFilterConfirmOpen(false)} className="flex-1 rounded-[12px] border border-[var(--dash-border)] py-2.5 text-sm font-bold text-[var(--dash-text-secondary)]">
              Cancelar
            </button>
            <button
              onClick={() => filterChangeMut.mutate()}
              disabled={filterChangeMut.isPending}
              className="flex-1 rounded-[12px] py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--dash-green)" }}
            >
              {filterChangeMut.isPending ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={subView === "history"} onClose={() => setSubView(null)} title="Visit History">
        <ClientHistoryList client={client} />
      </Modal>
      <Modal open={subView === "chemicals"} onClose={() => setSubView(null)} title="Chemistry Readings" maxWidth="max-w-lg">
        <ChemistryReadingsView client={client} todayStopId={todayStopId} onClose={onClose} />
      </Modal>
      <Modal open={subView === "products"} onClose={() => setSubView(null)} title="Histórico de Produtos" maxWidth="max-w-lg">
        <ProductsHistoryView client={client} todayStopId={todayStopId} onClose={onClose} />
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

const READING_KEYS: ChemicalReadingKey[] = ["free_chlorine", "ph", "total_alkalinity", "calcium_hardness", "stabilizer", "salt"];

const READING_BADGE: Record<ChemicalReadingKey, { abbr: string; bg: string; fg: string }> = {
  free_chlorine: { abbr: "Cl", bg: "#DCFCE7", fg: "#16A34A" },
  ph: { abbr: "pH", bg: "#DBEAFE", fg: "#2563EB" },
  total_alkalinity: { abbr: "Alk", bg: "#FEF3C7", fg: "#B45309" },
  calcium_hardness: { abbr: "Ca", bg: "#EDE4FB", fg: "#7C3AED" },
  stabilizer: { abbr: "CYA", bg: "#FFE4E6", fg: "#E11D48" },
  salt: { abbr: "Salt", bg: "#CCFBF1", fg: "#0D9488" },
};

const READING_RECOMMENDATIONS: Record<ChemicalReadingKey, { high: string; low: string }> = {
  free_chlorine: { high: "Free Chlorine is high. Let it settle before adding more.", low: "Free Chlorine is low. Add chlorine to bring it into range." },
  ph: { high: "pH is high. Add pH decreaser (muriatic acid).", low: "pH is low. Add pH increaser (soda ash)." },
  total_alkalinity: { high: "Total Alkalinity is high. Add pH decreaser to lower it.", low: "Total Alkalinity is low. Add baking soda to raise it." },
  calcium_hardness: { high: "Calcium Hardness is high. Consider partial water replacement.", low: "Calcium Hardness is low. Add calcium increaser." },
  stabilizer: { high: "Stabilizer (CYA) is high. Consider partial water replacement.", low: "Stabilizer (CYA) is low. Add stabilizer/conditioner." },
  salt: { high: "Salt is high. Consider partial water replacement.", low: "Salt is low. Add a bag of salt." },
};

function readingStatus(key: ChemicalReadingKey, value: number | null): "good" | "high" | "low" | null {
  if (value == null) return null;
  const meta = CHEMICAL_READING_META[key];
  if (value > meta.max) return "high";
  if (value < meta.min) return "low";
  return "good";
}

function ChemistryReadingsView({
  client, todayStopId, onClose,
}: { client: TechnicianClient; todayStopId: string | null; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["my-client-chemicals-history", client.client_id],
    queryFn: () => getMyClientChemicalsHistory(client.client_id),
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["my-client-visit-history", client.client_id],
    queryFn: () => getMyClientVisitHistory(client.client_id),
  });
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Loading...</p>;

  function needsTodayStop() {
    toast.info("Só disponível no dia da visita agendada");
  }

  const address = clientFullAddress(client);
  const visibleReadingKeys = READING_KEYS.filter((k) => k !== "salt" || client.has_salt_system);
  // Pool is the "default" body for this summary/history view — the Spa
  // gets its own independent readings, browsable via the toggle on the
  // main Chemicals page where they're actually logged.
  const poolHistory = history.filter((h) => h.body_type === "pool");
  const completedVisits = visits.filter((v) => v.status === "Concluído").length;
  const latest = poolHistory[0] ?? null;
  const latestVisit = latest ? visits.find((v) => v.route_stop_id === latest.route_stop_id) : null;
  const latestTime = latestVisit?.completed_at ?? latestVisit?.started_at ?? null;
  const latestTimeLabel = latestTime
    ? new Date(latestTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  const outOfRange = latest
    ? visibleReadingKeys.map((k) => ({ key: k, status: readingStatus(k, latest[k]) })).filter(
        (r): r is { key: ChemicalReadingKey; status: "high" | "low" } => r.status === "high" || r.status === "low",
      )
    : [];

  const visible = showAll ? poolHistory : poolHistory.slice(0, 4);

  const addReadingsButton = todayStopId ? (
    <Link to="/tecnico/chemicals/$stopId" params={{ stopId: todayStopId }} onClick={onClose}>
      <button className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white" style={{ background: "#4F46E5" }}>
        <PlusCircle className="h-4 w-4" /> Add New Readings
      </button>
    </Link>
  ) : (
    <button onClick={needsTodayStop} className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white" style={{ background: "#4F46E5" }}>
      <PlusCircle className="h-4 w-4" /> Add New Readings
    </button>
  );

  const productsUsedButton = todayStopId ? (
    <Link to="/tecnico/chemicals/$stopId" params={{ stopId: todayStopId }} onClick={onClose}>
      <button className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
        <TestTube className="h-4 w-4" /> Products Used
      </button>
    </Link>
  ) : (
    <button onClick={needsTodayStop} className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
      <TestTube className="h-4 w-4" /> Products Used
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold ${avatarColors[nameHash(client.name) % avatarColors.length]}`}>
          {initials(client.name)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--dash-text)]">{client.name}</span>
            <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">{client.client_type}</span>
          </div>
          {address && (
            <div className="mt-1 flex items-start gap-1 text-[12px] text-[var(--dash-text-secondary)]">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--dash-navy)" }} /> {address}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[var(--dash-border)] rounded-[14px] border border-[var(--dash-border)] bg-white py-3">
        <StatCell icon={FlaskConical} bg="#EDE4FB" fg="#7C3AED" value={visibleReadingKeys.length} label="Chemicals Tracked" />
        <StatCell icon={CheckCircle2} bg="#DCFCE7" fg="#16A34A" value={completedVisits} label="Completed Visits" />
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "#FFEDD5", color: "#C2410C" }}>
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-[13px] font-extrabold leading-tight text-[var(--dash-text)]">{latest ? fmtDate(latest.route_date) : "—"}</div>
          <div className="text-[11px] text-[var(--dash-text-muted)]">Last Updated</div>
          {latestTimeLabel && <div className="text-[10.5px] text-[var(--dash-text-muted)]">{latestTimeLabel}</div>}
        </div>
      </div>

      {!latest ? (
        <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">No readings logged yet.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--dash-text)]">Latest Readings</h3>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-[var(--dash-badge-paid-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--dash-badge-paid-text)]">Completed</span>
              {latestTimeLabel && (
                <span className="rounded-full bg-[var(--dash-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--dash-text-muted)]">{latestTimeLabel}</span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-[var(--dash-border)]">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--dash-border)] text-[10.5px] uppercase tracking-wide text-[var(--dash-text-muted)]">
                  <th className="px-3 py-2 font-bold">Chemical</th>
                  <th className="px-3 py-2 font-bold">Your Reading</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleReadingKeys.map((k) => {
                  const value = latest[k];
                  const status = readingStatus(k, value);
                  const badge = READING_BADGE[k];
                  const color = status === "good" ? "var(--dash-green)" : status ? "#C2410C" : "var(--dash-text-muted)";
                  return (
                    <tr key={k} className="border-b border-[var(--dash-border)] last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: badge.bg, color: badge.fg }}>
                            {badge.abbr}
                          </span>
                          <span className="font-semibold text-[var(--dash-text)]">{CHEMICAL_READING_META[k].label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-bold text-[var(--dash-text)]">
                        {value != null ? `${value}${CHEMICAL_READING_META[k].unit ? ` ${CHEMICAL_READING_META[k].unit}` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {status && (
                          <span className="flex items-center gap-1.5 font-bold" style={{ color }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                            {status === "good" ? "Good" : status === "high" ? "High" : "Low"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {outOfRange.length > 0 && (
            <div className="flex items-start gap-2 rounded-[14px] bg-[#EFF6FF] p-3 text-[12.5px] text-[#1D4ED8]">
              <Droplet className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-0.5">
                <div className="font-bold">Recommendation</div>
                {outOfRange.map((r) => (
                  <div key={r.key}>{READING_RECOMMENDATIONS[r.key][r.status]}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {addReadingsButton}

      {poolHistory.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--dash-text)]">Reading History</h3>
            {poolHistory.length > 4 && (
              <button onClick={() => setShowAll((s) => !s)} className="text-[12.5px] font-bold" style={{ color: "#4F46E5" }}>
                {showAll ? "Show Less" : "View All ›"}
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-[14px] border border-[var(--dash-border)]">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--dash-border)] text-[10px] uppercase tracking-wide text-[var(--dash-text-muted)]">
                  <th className="px-2.5 py-2 font-bold">Date</th>
                  {visibleReadingKeys.map((k) => (
                    <th key={k} className="px-2 py-2 font-bold">{READING_BADGE[k].abbr}</th>
                  ))}
                  <th className="px-2.5 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const statuses = visibleReadingKeys.map((k) => readingStatus(k, entry[k]));
                  const anyOut = statuses.some((s) => s === "high" || s === "low");
                  return (
                    <tr key={entry.route_stop_id} className="border-b border-[var(--dash-border)] last:border-0">
                      <td className="px-2.5 py-2 font-semibold text-[var(--dash-text)]">{fmtDate(entry.route_date)}</td>
                      {visibleReadingKeys.map((k) => {
                        const status = readingStatus(k, entry[k]);
                        const color = status === "good" ? "var(--dash-green)" : status ? "#C2410C" : "var(--dash-text-muted)";
                        return (
                          <td key={k} className="px-2 py-2 font-bold" style={{ color }}>
                            {entry[k] ?? "—"}
                          </td>
                        );
                      })}
                      <td className="px-2.5 py-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: anyOut ? "#C2410C" : "var(--dash-green)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {productsUsedButton}
    </div>
  );
}

// Pool is the "default" body for this summary/history view — same
// convention as ChemistryReadingsView above.
function ProductsHistoryView({
  client, todayStopId, onClose,
}: { client: TechnicianClient; todayStopId: string | null; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["my-client-chemicals-history", client.client_id],
    queryFn: () => getMyClientChemicalsHistory(client.client_id),
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Loading...</p>;

  function needsTodayStop() {
    toast.info("Só disponível no dia da visita agendada");
  }

  const poolHistory = history.filter((h) => h.body_type === "pool");

  const addProductsButton = todayStopId ? (
    <Link to="/tecnico/chemicals/$stopId" params={{ stopId: todayStopId }} onClick={onClose}>
      <button className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white" style={{ background: "#4F46E5" }}>
        <PlusCircle className="h-4 w-4" /> Registrar Produtos de Hoje
      </button>
    </Link>
  ) : (
    <button onClick={needsTodayStop} className="flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white" style={{ background: "#4F46E5" }}>
      <PlusCircle className="h-4 w-4" /> Registrar Produtos de Hoje
    </button>
  );

  return (
    <div className="space-y-4">
      {poolHistory.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Nenhum produto registrado ainda.</p>
      ) : (
        <div className="space-y-2.5">
          {poolHistory.map((entry) => {
            const used = entry.products.filter((p) => p.qty > 0);
            return (
              <div key={entry.route_stop_id} className="rounded-[14px] border border-[var(--dash-border)] p-3">
                <div className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--dash-text)]">
                  <CalendarDays className="h-3.5 w-3.5" style={{ color: "#7C3AED" }} /> {fmtDate(entry.route_date)}
                </div>
                {used.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {used.map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-[13px] text-[var(--dash-text-secondary)]">
                        <span>{p.name}</span>
                        <span className="font-bold text-[var(--dash-text)]">{formatProductQty(p.qty)} {p.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[12.5px] text-[var(--dash-text-muted)]">Nenhum produto usado nesta visita.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addProductsButton}
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
