import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import {
  Plus, Search, Filter, ChevronDown,
  ChevronRight, Pencil, Trash2, Users, CalendarDays,
  LayoutGrid, List as ListIcon, MoreVertical, Phone, MessageSquare, FileText, MapPin,
  CheckCircle2, Route as RouteIcon, DollarSign, AlertTriangle, Star, Mail,
} from "lucide-react";
import { listClients, listTechnicians, listInvoices, listRoutesForDate, removeStaleClientStops, scheduleOneTimeVisit, fmtDate, initials, fmt, type Client, type Invoice, type ClientContact, type Technician } from "@/lib/db";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { PhotoUploader, PhotoThumb } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import poolImg from "@/assets/pool.jpg";

function formatPhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "").slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);
  if (digits.length <= 3) return p1 ? `(${p1}` : "";
  if (digits.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const avatarColors = [
  "bg-sky-200 text-sky-800", "bg-orange-200 text-orange-800", "bg-purple-200 text-purple-800",
  "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800", "bg-green-200 text-green-800",
  "bg-cyan-200 text-cyan-800", "bg-amber-200 text-amber-800",
];

type ClientFull = Client & {
  address?: string | null; city?: string | null; state?: string | null; zip?: string | null;
  service_days?: string[] | null; notes?: string | null;
  monthly_value?: number | null;
  pool_photos?: string[] | null;
  equipment_photos?: string[] | null;
  gate_code?: string | null;
  contacts?: ClientContact[] | null;
};

const dayColors: Record<string, { bg: string; text: string }> = {
  "Seg": { bg: "#DBEAFE", text: "#1D4ED8" },
  "Ter": { bg: "#CCFBF1", text: "#0F766E" },
  "Qua": { bg: "#FEF3C7", text: "#B45309" },
  "Qui": { bg: "#FFE4E6", text: "#BE123C" },
  "Sex": { bg: "#EDE4FB", text: "#7C3AED" },
  "Sáb": { bg: "#DCFCE7", text: "#15803D" },
  "Dom": { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" },
};

const dayLabelsEn: Record<string, string> = {
  "Seg": "Mon", "Ter": "Tue", "Qua": "Wed", "Qui": "Thu", "Sex": "Fri", "Sáb": "Sat", "Dom": "Sun",
};

function dayBadgeLabel(days?: string[] | null) {
  if (!days || days.length === 0) return null;
  return days.map((d) => dayLabelsEn[d] ?? d).join(", ");
}

function statusInfo(c: Client) {
  const isOnRoute = (c.service_days ?? []).length > 0;
  if (c.status !== "Ativo") return { label: "Inactive", dot: "var(--dash-text-muted)" };
  if (isOnRoute) return { label: "Active", dot: "var(--dash-green)" };
  if (c.stage === "Prospecção") return { label: "Prospect", dot: "var(--dash-orange)" };
  return { label: "Active", dot: "var(--dash-green)" };
}

function fullAddress(c: ClientFull) {
  return [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
}

function ClientCardPhoto({ client }: { client: ClientFull }) {
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
  return <img src={url || poolImg} alt="" className="h-full w-full object-cover" />;
}

function ClientCard({
  client, onView, onEdit, onDelete,
}: { client: ClientFull; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = statusInfo(client);
  const dayLabel = dayBadgeLabel(client.service_days);
  const dayColor = dayColors[client.service_days?.[0] ?? ""] ?? { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" };
  const hasMonthly = client.monthly_value != null && Number(client.monthly_value) > 0;
  const cityLine = [client.city, [client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--dash-border)] bg-white" style={cardShadow}>
      <div className="flex">
        <div className="relative h-44 w-[38%] shrink-0 bg-[var(--dash-bg)]">
          <ClientCardPhoto client={client} />
        </div>

        <div className="relative flex-1 p-4 pr-11">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-3 top-11 z-20 w-32 overflow-hidden rounded-[10px] border border-[var(--dash-border)] bg-white shadow-lg">
                <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
                  <Pencil className="h-3.5 w-3.5" style={{ color: "var(--dash-navy)" }} /> Edit
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--dash-bg)]" style={{ color: "var(--dash-red)" }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onView} className="text-left">
                <span className="text-[16.2px] font-extrabold text-[var(--dash-text)] hover:underline">{client.name}</span>
              </button>
            </div>
            <div className="mt-1.5 truncate text-[13.5px] text-[var(--dash-text-secondary)]">{client.address || "—"}</div>
            <div className="truncate text-[13.5px] text-[var(--dash-text-secondary)]">{cityLine || "—"}</div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {dayLabel ? (
                <span className="flex shrink-0 items-center gap-1 truncate rounded-full px-2.5 py-1.5 text-[12px] font-bold" style={{ background: dayColor.bg, color: dayColor.text }}>
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" /> {dayLabel}
                </span>
              ) : (
                <span className="text-[12px] font-semibold text-[var(--dash-text-muted)]">Not assigned</span>
              )}
              <span className="shrink-0 whitespace-nowrap text-base font-extrabold tabular-nums" style={{ color: "#0B63F6" }}>
                {hasMonthly ? fmt(Number(client.monthly_value)).replace(/\.00$/, "") : "—"}
                <span className="text-[11px] font-semibold text-[var(--dash-text-muted)]">/mo</span>
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: status.dot }}>
                <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} /> {status.label}
              </div>
              <button
                type="button"
                onClick={onView}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--dash-border)] px-4 py-2.5 text-sm font-bold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]"
              >
                View <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_FILTERS = [
  { v: "Seg", label: "Mon" },
  { v: "Ter", label: "Tue" },
  { v: "Qua", label: "Wed" },
  { v: "Qui", label: "Thu" },
  { v: "Sex", label: "Fri" },
];

type DayFilter = "all" | "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "prospects" | "inactive";
type SortBy = "name-asc" | "name-desc" | "value-desc" | "recent";

function todayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SummaryStat({
  icon: Icon, iconColor, iconBg, value, label, sub, subColor, subArrow, onClick,
}: {
  icon: typeof Users; iconColor: string; iconBg: string; value: string | number; label: string;
  sub: string; subColor?: string; subArrow?: boolean; onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="w-[130px] shrink-0 rounded-[14px] border border-[#E9EDF5] bg-white p-3 text-left sm:w-auto sm:rounded-[20px] sm:p-6" style={cardShadow}>
      <div className="grid h-8 w-8 place-items-center rounded-full sm:h-12 sm:w-12" style={{ background: iconBg, color: iconColor }}>
        <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
      </div>
      <div className="mt-2 truncate text-lg font-extrabold leading-none tracking-tight text-[var(--dash-text)] sm:mt-3.5 sm:text-[26px]">{value}</div>
      <div className="mt-1 truncate text-[11px] font-bold leading-tight text-[var(--dash-text)] sm:mt-1.5 sm:text-[15px]">{label}</div>
      <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold sm:mt-1 sm:gap-1.5 sm:text-[13px]" style={{ color: subColor || "var(--dash-text-muted)" }}>
        {sub}{subArrow && <span aria-hidden="true">→</span>}
      </div>
    </Comp>
  );
}

function FilterChip({
  active, onClick, label, count, tint,
}: { active: boolean; onClick: () => void; label: string; count: number; tint?: { bg: string; text: string } }) {
  const t = tint ?? { bg: "var(--dash-navy)", text: "#fff" };
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition"
      style={{ background: active ? t.bg : "transparent", color: active ? t.text : (tint ? t.text : "var(--dash-text-secondary)") }}
    >
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
        style={{ background: active ? "rgba(255,255,255,.3)" : "var(--dash-border-table)", color: active ? t.text : "var(--dash-text-muted-2)" }}
      >
        {count}
      </span>
    </button>
  );
}

function useClientAllStops(clientId: string) {
  return useQuery({
    queryKey: ["client-all-stops", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("id, status, route:routes(route_date)")
        .eq("client_id", clientId);
      if (error) throw error;
      return (data ?? [])
        .map((s) => ({ id: s.id, status: s.status as string, route_date: (s.route as { route_date: string } | null)?.route_date ?? "" }))
        .filter((s) => s.route_date);
    },
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--dash-text-muted)]">{label}</span>
      <span className="text-right font-semibold text-[var(--dash-text)]">{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon, label, href, to, external,
}: { icon: typeof Phone; label: string; href?: string; to?: "/invoice" | "/estimativa" | "/rotas"; external?: boolean }) {
  const disabled = !href && !to;
  const className = `flex flex-col items-center gap-1 rounded-[12px] border border-[var(--dash-border)] py-2.5 text-[11px] font-semibold ${disabled ? "pointer-events-none text-[var(--dash-text-muted)] opacity-40" : "text-[var(--dash-navy)] hover:bg-[var(--dash-bg)]"}`;
  if (to) return <Link to={to} className={className}><Icon className="h-4 w-4" />{label}</Link>;
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={className}><Icon className="h-4 w-4" />{label}</a>;
}

function ClientDetailPanel({
  client, invoices, technicians, onEdit, onDelete,
}: { client: ClientFull; invoices: Invoice[]; technicians: Technician[]; onEdit: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState<"overview" | "services" | "schedule" | "invoices" | "notes" | "photos" | "documents">("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const status = statusInfo(client);
  const addr = fullAddress(client);
  const years = Math.max(0, new Date().getFullYear() - new Date(client.created_at).getFullYear());
  const hasMonthly = client.monthly_value != null && Number(client.monthly_value) > 0;
  const tech = technicians.find((t) => t.id === client.technician_id);
  const clientInvoices = invoices.filter((i) => i.client_id === client.id).slice().sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  const todayStr = todayDateStr();
  const { data: stops = [] } = useClientAllStops(client.id);
  const nextStop = stops.filter((s) => s.route_date >= todayStr && s.status !== "Concluído").sort((a, b) => a.route_date.localeCompare(b.route_date))[0];
  const lastStop = stops.filter((s) => s.status === "Concluído").sort((a, b) => b.route_date.localeCompare(a.route_date))[0];
  const photoCount = (client.pool_photos?.length ?? 0) + (client.equipment_photos?.length ?? 0);

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "services", label: "Services" },
    { key: "schedule", label: "Schedule" },
    { key: "invoices", label: "Invoices", count: clientInvoices.length },
    { key: "notes", label: "Notes" },
    { key: "photos", label: "Photos", count: photoCount },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative h-52 w-full overflow-hidden rounded-[18px] bg-[var(--dash-bg)]">
        <ClientCardPhoto client={client} />
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-[10px] bg-white/95 px-3 py-1.5 text-xs font-bold text-[var(--dash-text)] shadow hover:bg-white">
            <Pencil className="h-3.5 w-3.5" /> Edit Client
          </button>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="More actions" className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[var(--dash-text-secondary)] shadow hover:bg-white">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-[10px] border border-[var(--dash-border)] bg-white shadow-lg">
                  <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--dash-bg)]" style={{ color: "var(--dash-red)" }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="absolute bottom-3 left-4 grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white ring-4 ring-white" style={{ background: "var(--dash-navy)" }}>
          {initials(client.name)}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-extrabold text-[var(--dash-text)]">{client.name}</h3>
          <Star className="h-4 w-4" style={{ color: "#F59E0B" }} fill="#F59E0B" />
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: status.dot }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} /> {status.label}
          </span>
        </div>
        <div className="mt-1 text-sm text-[var(--dash-text-secondary)]">{addr || "—"}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--dash-text-secondary)]">
          {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-[var(--dash-navy)]"><Phone className="h-3.5 w-3.5" /> {formatPhone(client.phone)}</a>}
          {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-[var(--dash-navy)]"><Mail className="h-3.5 w-3.5" /> {client.email}</a>}
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Client for {years} year{years === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-[var(--dash-border)] p-3.5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Monthly Rate</div>
          <div className="text-lg font-extrabold text-[var(--dash-text)]">{hasMonthly ? `${fmt(Number(client.monthly_value))}/mo` : "—"}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Next Service</div>
          <div className="text-lg font-extrabold" style={{ color: "var(--dash-navy)" }}>{nextStop ? fmtDate(nextStop.route_date) : "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <QuickAction icon={Phone} label="Call" href={client.phone ? `tel:${client.phone}` : undefined} />
        <QuickAction icon={MessageSquare} label="Text" href={client.phone ? `sms:${client.phone}` : undefined} />
        <QuickAction icon={FileText} label="Invoice" to="/invoice" />
        <QuickAction icon={FileText} label="Estimate" to="/estimativa" />
        <QuickAction icon={RouteIcon} label="Route" to="/rotas" />
        <QuickAction icon={MapPin} label="Map" href={addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : undefined} external />
      </div>

      <div className="flex gap-4 overflow-x-auto border-b border-[var(--dash-border)] text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-2.5 font-semibold"
            style={{ borderBottom: tab === t.key ? "2px solid var(--dash-navy)" : "2px solid transparent", color: tab === t.key ? "var(--dash-navy)" : "var(--dash-text-muted)" }}
          >
            {t.label}
            {t.count != null && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: tab === t.key ? "var(--dash-water-bg)" : "var(--dash-border-table)", color: tab === t.key ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-[14px] border border-[var(--dash-border)] p-4">
              <div className="font-bold text-[var(--dash-text)]">Service Information</div>
              <div className="mt-3 space-y-2 text-sm">
                <InfoRow label="Service Type" value="Pool Cleaning & Maintenance" />
                <InfoRow label="Service Day" value={(client.service_days && client.service_days.length) ? client.service_days.join(", ") : "Not assigned"} />
                <InfoRow label="Frequency" value={client.service_frequency || ((client.service_days?.length ?? 0) > 0 ? "Weekly" : "—")} />
                <InfoRow label="Technician" value={tech?.name || "Unassigned"} />
              </div>
            </div>

            <div className="rounded-[14px] border border-[var(--dash-border)] p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[var(--dash-text)]">Last Service</div>
                {lastStop && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" }}>Completed</span>
                )}
              </div>
              {lastStop ? (
                <>
                  <div className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{fmtDate(lastStop.route_date)}</div>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--dash-text-secondary)]">
                    {["Cleaned pool", "Balanced chemicals", "Emptied skimmer baskets", "Brushed walls and steps", "Checked equipment"].map((item) => (
                      <li key={item} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-green)" }} /> {item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--dash-text-muted)]">No completed service yet.</p>
              )}
            </div>

            <div className="rounded-[14px] border border-[var(--dash-border)] p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[var(--dash-text)]">Recent Invoices</div>
                <button type="button" onClick={() => setTab("invoices")} className="text-xs font-semibold" style={{ color: "var(--dash-link)" }}>View All</button>
              </div>
              {clientInvoices.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--dash-text-muted)]">No invoices yet.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {clientInvoices.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold text-[var(--dash-text)]">{inv.number}</div>
                        <div className="text-xs text-[var(--dash-text-muted)]">{fmtDate(inv.invoice_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums text-[var(--dash-text)]">{fmt(inv.total)}</div>
                        <div className="text-xs font-semibold" style={{ color: inv.status === "PAID" ? "var(--dash-green)" : "var(--dash-badge-unpaid-text)" }}>{inv.status === "PAID" ? "Paid" : "Unpaid"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--dash-border)] p-4">
            <div className="font-bold text-[var(--dash-text)]">Notes</div>
            <p className="mt-2 text-sm text-[var(--dash-text-secondary)]">{client.notes || "No notes yet."}</p>
            {client.gate_code && <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">Gate code {client.gate_code}.</p>}
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="rounded-[14px] border border-dashed border-[var(--dash-border)] p-8 text-center text-sm text-[var(--dash-text-muted)]">
          Detailed service breakdown coming soon.
        </div>
      )}

      {tab === "schedule" && <ClientScheduledStops clientId={client.id} />}

      {tab === "invoices" && <ClientInvoicesHistory clientId={client.id} />}

      {tab === "notes" && (
        <div className="rounded-[14px] border border-[var(--dash-border)] p-4 text-sm text-[var(--dash-text-secondary)]">
          {client.notes || "No notes yet."}
        </div>
      )}

      {tab === "photos" && (
        <div>
          {photoCount === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--dash-border)] p-8 text-center text-sm text-[var(--dash-text-muted)]">No photos uploaded yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(client.pool_photos ?? []).map((p) => <PhotoThumb key={p} path={p} />)}
              {(client.equipment_photos ?? []).map((p) => <PhotoThumb key={p} path={p} />)}
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="rounded-[14px] border border-dashed border-[var(--dash-border)] p-8 text-center text-sm text-[var(--dash-text-muted)]">
          Document uploads aren't available yet.
        </div>
      )}
    </div>
  );
}

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name-asc");
  const [viewClient, setViewClient] = useState<ClientFull | null>(null);
  const [editClient, setEditClient] = useState<ClientFull | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientFull | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedListClientId, setSelectedListClientId] = useState<string | null>(null);
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });
  const todayStr = todayDateStr();
  const { data: todayRoutes = [] } = useQuery({ queryKey: ["routes-for-date", todayStr], queryFn: () => listRoutesForDate(todayStr) });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !search
      || c.name.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || (c.address || "").toLowerCase().includes(q);
    let matchesFilter = true;
    if (dayFilter === "prospects") matchesFilter = c.stage === "Prospecção";
    else if (dayFilter === "inactive") matchesFilter = c.status !== "Ativo";
    else if (dayFilter !== "all") matchesFilter = (c.service_days ?? []).includes(dayFilter);
    return matchesSearch && matchesFilter;
  });

  const sorted = filtered.slice().sort((a, b) => {
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "value-desc") return Number((b as ClientFull).monthly_value || 0) - Number((a as ClientFull).monthly_value || 0);
    if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.name.localeCompare(b.name);
  });

  const total = clients.length;
  const ativos = clients.filter((c) => c.status === "Ativo" && c.stage !== "Prospecção").length;
  const prospectCount = clients.filter((c) => c.stage === "Prospecção").length;
  const inactiveCount = clients.filter((c) => c.status !== "Ativo").length;
  const countByDay = (d: string) => clients.filter((c) => (c.service_days ?? []).includes(d)).length;
  const monthlyRevenue = clients
    .filter((c) => c.status === "Ativo" && c.stage !== "Prospecção")
    .reduce((s, c) => s + Number((c as ClientFull).monthly_value || 0), 0);
  const overdueInvoices = invoices.filter((i) => i.status !== "PAID" && i.due_date && i.due_date < todayStr);
  const invoicesDueCount = overdueInvoices.length;
  const invoicesDueAmount = overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const todayRouteCount = todayRoutes.reduce((s, r) => s + (r.route_stops?.length ?? 0), 0);
  const todayTechnicianCount = new Set(todayRoutes.filter((r) => (r.route_stops?.length ?? 0) > 0).map((r) => r.technician_id)).size;

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteClient(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="space-y-5 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--dash-text)]">Clients</h1>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> New Client
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-3 text-sm" />
          </div>
          <button className="flex shrink-0 items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm text-[var(--dash-text-secondary)]"><Filter className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Filter</button>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary)]" aria-label="More options"><MoreVertical className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
          <SummaryStat
            icon={Users} iconColor="#0B63F6" iconBg="#DBEAFE"
            value={total} label="Total Clients"
            sub="View all" subColor="#0B63F6" subArrow
            onClick={() => { setDayFilter("all"); setSearch(""); }}
          />
          <SummaryStat
            icon={CheckCircle2} iconColor="var(--dash-green)" iconBg="#DCFCE7"
            value={ativos} label="Active Clients"
            sub={`${total > 0 ? Math.round((ativos / total) * 100) : 0}% of total`} subColor="var(--dash-green)"
          />
          <SummaryStat
            icon={RouteIcon} iconColor="var(--dash-orange)" iconBg="#FFEDD5"
            value={todayRouteCount} label="Today's Route"
            sub={`${todayTechnicianCount} technician${todayTechnicianCount === 1 ? "" : "s"}`}
          />
          <SummaryStat
            icon={DollarSign} iconColor="#7C3AED" iconBg="#EDE4FB"
            value={fmt(monthlyRevenue)} label="Monthly Revenue"
            sub="Expected this month" subColor="#7C3AED" subArrow
          />
          <SummaryStat
            icon={AlertTriangle} iconColor="var(--dash-red)" iconBg="#FEE2E2"
            value={invoicesDueCount} label="Invoices Due"
            sub={invoicesDueCount > 0 ? `${fmt(invoicesDueAmount)} outstanding` : "All caught up"}
            subColor={invoicesDueCount > 0 ? "var(--dash-red)" : "var(--dash-green)"}
          />
        </div>

        <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3" style={cardShadow}>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-w-0 sm:flex-1 sm:pb-0">
            <FilterChip active={dayFilter === "all"} onClick={() => setDayFilter("all")} label="All" count={total} />
            {WEEKDAY_FILTERS.map((d) => (
              <FilterChip key={d.v} active={dayFilter === d.v} onClick={() => setDayFilter(d.v as DayFilter)} label={d.label} count={countByDay(d.v)} />
            ))}
            <FilterChip active={dayFilter === "prospects"} onClick={() => setDayFilter("prospects")} label="Prospects" count={prospectCount} tint={{ bg: "#FEF3C7", text: "#B45309" }} />
            <FilterChip active={dayFilter === "inactive"} onClick={() => setDayFilter("inactive")} label="Inactive" count={inactiveCount} tint={{ bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" }} />
          </div>
          <div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-0">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="appearance-none rounded-[11px] border border-[var(--dash-border)] bg-white py-2 pl-3 pr-8 text-sm font-semibold text-[var(--dash-text-secondary)]"
              >
                <option value="name-asc">Sort by: Name A-Z</option>
                <option value="name-desc">Sort by: Name Z-A</option>
                <option value="value-desc">Sort by: Monthly Value</option>
                <option value="recent">Sort by: Recently Added</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
            </div>
            <div className="flex overflow-hidden rounded-[11px] border border-[var(--dash-border)] bg-white">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                title="Grid view"
                className="grid h-9 w-9 place-items-center"
                style={{ background: viewMode === "grid" ? "var(--dash-navy)" : "#fff", color: viewMode === "grid" ? "#fff" : "var(--dash-text-secondary)" }}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                title="List view"
                className="grid h-9 w-9 place-items-center border-l border-[var(--dash-border)]"
                style={{ background: viewMode === "list" ? "var(--dash-navy)" : "#fff", color: viewMode === "list" ? "#fff" : "var(--dash-text-secondary)" }}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4 sm:p-6" style={cardShadow}>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
              <p className="mt-3 font-semibold text-[var(--dash-text-secondary)]">No clients registered</p>
              <p className="text-sm text-[var(--dash-text-muted)]">Clique em "New Client" para começar.</p>
              <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Add first client
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {sorted.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c as ClientFull}
                  onView={() => setViewClient(c as ClientFull)}
                  onEdit={() => setEditClient(c as ClientFull)}
                  onDelete={() => setDeleteClient(c as ClientFull)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
              <div className="overflow-hidden rounded-[14px] border border-[var(--dash-border)]">
                {sorted.map((c, idx) => {
                  const cf = c as ClientFull;
                  const activeId = selectedListClientId ?? sorted[0]?.id;
                  const isSelected = activeId === c.id;
                  const dayLabel = dayBadgeLabel(cf.service_days);
                  const dayColor = dayColors[cf.service_days?.[0] ?? ""] ?? { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" };
                  const hasMonthly = cf.monthly_value != null && Number(cf.monthly_value) > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedListClientId(c.id)}
                      className="flex w-full items-start gap-2.5 border-b border-[var(--dash-border)] p-3 text-left last:border-b-0"
                      style={{ background: isSelected ? "var(--dash-water-bg)" : "#fff" }}
                    >
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--dash-border)]" aria-label={`Select ${c.name}`} />
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarColors[idx % avatarColors.length]}`}>
                        {initials(c.name)}
                      </div>
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                        <ClientCardPhoto client={cf} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-[var(--dash-text)]">{c.name}</div>
                        <div className="truncate text-xs text-[var(--dash-text-muted)]">{cf.address || "—"}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {dayLabel ? (
                            <span className="truncate rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: dayColor.bg, color: dayColor.text }}>{dayLabel}</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[var(--dash-text-muted)]">Not assigned</span>
                          )}
                          <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: "var(--dash-navy)" }}>{hasMonthly ? `${fmt(Number(cf.monthly_value))}/mo` : "—"}</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
                    </button>
                  );
                })}
              </div>

              {(() => {
                const activeId = selectedListClientId ?? sorted[0]?.id ?? null;
                const activeClient = sorted.find((c) => c.id === activeId) as ClientFull | undefined;
                if (!activeClient) return null;
                return (
                  <ClientDetailPanel
                    client={activeClient}
                    invoices={invoices}
                    technicians={technicians}
                    onEdit={() => setEditClient(activeClient)}
                    onDelete={() => setDeleteClient(activeClient)}
                  />
                );
              })()}
            </div>
          )}
        </section>
      </main>

      <ClientFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />
      <ClientFormModal
        open={!!editClient}
        onClose={() => setEditClient(null)}
        editing={editClient}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />

      <Modal open={!!viewClient} onClose={() => setViewClient(null)} title="Client Details">
        {viewClient && (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={viewClient.name} />
            <Row label="Type" value={viewClient.client_type} />
            <Row label="Status" value={viewClient.status} />
            <Row label="Email" value={viewClient.email || "—"} />
            <Row label="Phone" value={viewClient.phone ? formatPhone(viewClient.phone) : "—"} />
            <Row label="Address" value={viewClient.address || "—"} />
            <div className="grid grid-cols-3 gap-3">
              <Row label="City" value={viewClient.city || "—"} />
              <Row label="State" value={viewClient.state || "—"} />
              <Row label="Zipcode" value={viewClient.zip || "—"} />
            </div>
            <Row label="Service days" value={(viewClient.service_days && viewClient.service_days.length) ? viewClient.service_days.join(", ") : "—"} />
            <Row label="Monthly value" value={fmt(Number(viewClient.monthly_value || 0))} />
            <Row label="Gate code" value={viewClient.gate_code || "—"} />
            {(viewClient.contacts && viewClient.contacts.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Additional contacts</div>
                <div className="mt-1 space-y-1">
                  {viewClient.contacts.map((c, i) => (
                    <div key={i} className="text-[var(--dash-text)]">{c.name} — {c.phone ? formatPhone(c.phone) : "—"}</div>
                  ))}
                </div>
              </div>
            )}
            <Row label="Notes" value={viewClient.notes || "—"} />
            <Row label="Registered" value={fmtDate(viewClient.created_at)} />
            {(viewClient.pool_photos && viewClient.pool_photos.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Pool photos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewClient.pool_photos.map((p) => <PhotoThumb key={p} path={p} />)}
                </div>
              </div>
            )}
            {(viewClient.equipment_photos && viewClient.equipment_photos.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Equipment photos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewClient.equipment_photos.map((p) => <PhotoThumb key={p} path={p} />)}
                </div>
              </div>
            )}
            <ClientInvoicesHistory clientId={viewClient.id} />
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewClient(null)} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteClient} onClose={() => setDeleteClient(null)} title="Delete client" maxWidth="max-w-md">
        {deleteClient && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--dash-text-secondary)]">
              Are you sure you want to delete <b>{deleteClient.name}</b>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteClient(null)} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
              <button
                disabled={delMut.isPending}
                onClick={() => delMut.mutate(deleteClient.id)}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--dash-red)" }}
              >
                {delMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">{label}</div>
      <div className="text-[var(--dash-text)]">{value}</div>
    </div>
  );
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = [
  { v: "Seg", label: "Segunda" },
  { v: "Ter", label: "Terça" },
  { v: "Qua", label: "Quarta" },
  { v: "Qui", label: "Quinta" },
  { v: "Sex", label: "Sexta" },
  { v: "Sáb", label: "Sábado" },
  { v: "Dom", label: "Domingo" },
];

function ClientFormModal({
  open, onClose, onSaved, editing,
}: { open: boolean; onClose: () => void; onSaved: () => void; editing?: ClientFull | null }) {
  const empty = {
    name: "", email: "", phone: "", address: "", city: "", state: "", zip: "",
    client_type: "Residential", status: "Ativo", stage: "Prospecção", service_days: [] as string[],
    monthly_value: 0 as number,
    pool_photos: [] as string[],
    equipment_photos: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
    technician_id: null as string | null,
    gate_code: "",
    contacts: [] as ClientContact[],
    has_spa: false,
  };
  const [form, setForm] = useState(empty);
  const [visitMode, setVisitMode] = useState<"recorrente" | "unica">("recorrente");
  const [oneTimeDate, setOneTimeDate] = useState(tomorrowStr());
  const [oneTimeNote, setOneTimeNote] = useState("");
  const [oneTimeTechnicianId, setOneTimeTechnicianId] = useState<string | null>(null);
  const [showVisitSchedule, setShowVisitSchedule] = useState(false);
  const [userId, setUserId] = useState<string>("anon");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); }); }, []);
  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians, enabled: open });

  // reset when editing changes
  const editingId = editing?.id ?? null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && editingId !== loadedId) {
    if (editing) {
      setForm({
        name: editing.name || "",
        email: editing.email || "",
        phone: editing.phone || "",
        address: editing.address || "",
        city: editing.city || "",
        state: editing.state || "",
        zip: editing.zip || "",
        client_type: editing.client_type || "Residential",
        status: editing.status || "Ativo",
        stage: editing.stage || "Cliente",
        service_days: editing.service_days || [],
        monthly_value: Number(editing.monthly_value || 0),
        pool_photos: editing.pool_photos || [],
        equipment_photos: editing.equipment_photos || [],
        lat: editing.lat ?? null,
        lng: editing.lng ?? null,
        technician_id: editing.technician_id ?? null,
        gate_code: editing.gate_code || "",
        contacts: editing.contacts || [],
        has_spa: editing.has_spa ?? false,
      });
    } else {
      setForm(empty);
    }
    setVisitMode("recorrente");
    setOneTimeDate(tomorrowStr());
    setOneTimeNote("");
    setOneTimeTechnicianId(editing?.technician_id ?? null);
    setLoadedId(editingId);
  }
  if (!open && loadedId !== null) setLoadedId(null);

  const toggleDay = (d: string) =>
    setForm((f) => ({ ...f, service_days: f.service_days.includes(d) ? f.service_days.filter((x) => x !== d) : [...f.service_days, d] }));

  const mut = useMutation({
    mutationFn: async (values: typeof form) => {
      let clientId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("clients").update(values).eq("id", editing.id);
        if (error) throw error;
        await removeStaleClientStops(editing.id, values.service_days);
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not authenticated");
        const { data, error } = await supabase.from("clients").insert({ ...values, user_id: u.user.id }).select("id").single();
        if (error) throw error;
        clientId = data.id;
      }

      if (visitMode === "unica" && clientId && oneTimeTechnicianId) {
        await scheduleOneTimeVisit(oneTimeTechnicianId, oneTimeDate, clientId, oneTimeNote);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Client updated!" : "Client created!");
      if (visitMode === "unica") toast.success("One-time visit scheduled!");
      setForm(empty);
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (visitMode === "unica" && !oneTimeTechnicianId) {
      toast.error("Choose a technician for this one-time visit");
      return;
    }
    mut.mutate(form);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Client" : "New Client"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={formatPhone(form.phone)} onChange={(v) => setForm({ ...form, phone: formatPhone(v) })} />
        </div>
        <div>
          {form.contacts.map((c, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                value={c.name}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  contacts: f.contacts.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)),
                }))}
                placeholder="Contact name"
                className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
              <input
                value={formatPhone(c.phone)}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  contacts: f.contacts.map((x, xi) => (xi === i ? { ...x, phone: formatPhone(e.target.value) } : x)),
                }))}
                placeholder="Contact phone"
                className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, contacts: f.contacts.filter((_, xi) => xi !== i) }))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-red)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: "", phone: "" }] }))}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--dash-link)" }}
          >
            <Plus className="h-3 w-3" /> Add contact
          </button>
        </div>
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onSelectPlace={(p) => setForm((f) => ({
            ...f,
            address: p.address,
            city: p.city || f.city,
            state: p.state || f.state,
            zip: p.zip || f.zip,
            lat: p.lat ?? f.lat,
            lng: p.lng ?? f.lng,
          }))}
        />
        <div className="grid grid-cols-3 gap-4">
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="Zipcode" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
        </div>
        <Field label="Gate code" value={form.gate_code} onChange={(v) => setForm({ ...form, gate_code: v })} />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Type</label>
            <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Residential</option><option>Commercial</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Ativo</option><option>Inativo</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Stage</label>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Cliente</option><option>Prospecção</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm text-[var(--dash-text-secondary)]">
          <input
            type="checkbox"
            checked={form.has_spa}
            onChange={(e) => setForm({ ...form, has_spa: e.target.checked })}
            className="h-4 w-4"
          />
          This client has a Spa (tracked independently from the Pool)
        </label>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Schedule</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisitMode("recorrente")}
              className="rounded-[10px] border px-3 py-2 text-sm font-semibold transition"
              style={{
                borderColor: visitMode === "recorrente" ? "var(--dash-navy)" : "var(--dash-border)",
                background: visitMode === "recorrente" ? "var(--dash-navy)" : "#fff",
                color: visitMode === "recorrente" ? "#fff" : "var(--dash-text-secondary)",
              }}
            >
              Recorrente
            </button>
            <button
              type="button"
              onClick={() => setVisitMode("unica")}
              className="rounded-[10px] border px-3 py-2 text-sm font-semibold transition"
              style={{
                borderColor: visitMode === "unica" ? "var(--dash-navy)" : "var(--dash-border)",
                background: visitMode === "unica" ? "var(--dash-navy)" : "#fff",
                color: visitMode === "unica" ? "#fff" : "var(--dash-text-secondary)",
              }}
            >
              Visita única
            </button>
          </div>

          {visitMode === "recorrente" ? (
            <>
              <p className="mt-2 text-xs text-[var(--dash-text-muted)]">Select one or more days of the week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const active = form.service_days.includes(d.v);
                  return (
                    <button
                      type="button"
                      key={d.v}
                      onClick={() => toggleDay(d.v)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        borderColor: active ? "var(--dash-navy)" : "var(--dash-border)",
                        background: active ? "var(--dash-navy)" : "#fff",
                        color: active ? "#fff" : "var(--dash-text-secondary)",
                      }}
                    >
                      {d.v}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[var(--dash-text-muted)]">Doesn't change the client's recurring days — just adds one extra visit. Add as many as you need, even more than one on the same day with a different technician.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Date</label>
                  <input
                    type="date"
                    value={oneTimeDate}
                    onChange={(e) => setOneTimeDate(e.target.value)}
                    className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Technician</label>
                  <select
                    value={oneTimeTechnicianId ?? ""}
                    onChange={(e) => setOneTimeTechnicianId(e.target.value || null)}
                    className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Service note</label>
                <textarea
                  value={oneTimeNote}
                  onChange={(e) => setOneTimeNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. replace filter sand, check for leak..."
                  className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
                />
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => setShowVisitSchedule(true)}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--dash-link)" }}
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Ver visitas agendadas
                </button>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Assigned Technician</label>
          <p className="text-xs text-[var(--dash-text-muted)]">Who normally services this client — required for recurring days to auto-schedule</p>
          <select
            value={form.technician_id ?? ""}
            onChange={(e) => setForm({ ...form, technician_id: e.target.value || null })}
            className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Monthly pool value (USD)</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--dash-text-muted)]">$</span>
            <input
              type="number" min="0" step="0.01"
              value={form.monthly_value}
              onChange={(e) => setForm({ ...form, monthly_value: Number(e.target.value) })}
              className="w-full rounded-[10px] border border-[var(--dash-border-input)] py-2 pl-7 pr-3 text-sm"
            />
          </div>
        </div>
        <PhotoUploader
          label="Pool photos"
          value={form.pool_photos}
          onChange={(v) => setForm({ ...form, pool_photos: v })}
          folder={`${userId}/pool`}
        />
        <PhotoUploader
          label="Equipment photos"
          value={form.equipment_photos}
          onChange={(v) => setForm({ ...form, equipment_photos: v })}
          folder={`${userId}/equipment`}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
          <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Saving..." : editing ? "Update Client" : "Save Client"}
          </button>
        </div>
      </form>

      {editing && (
        <Modal open={showVisitSchedule} onClose={() => setShowVisitSchedule(false)} title="Visitas agendadas" maxWidth="max-w-lg">
          <ClientScheduledStops clientId={editing.id} />
        </Modal>
      )}
    </Modal>
  );
}

function ClientScheduledStops({ clientId }: { clientId: string }) {
  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["client-scheduled-stops", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("id, status, notes, manual, route:routes(route_date)")
        .eq("client_id", clientId)
        .order("id");
      if (error) throw error;
      return (data ?? [])
        .map((s) => ({ id: s.id, status: s.status, notes: s.notes, manual: s.manual, route_date: (s.route as { route_date: string } | null)?.route_date ?? "" }))
        .filter((s) => s.route_date)
        .sort((a, b) => b.route_date.localeCompare(a.route_date));
    },
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Loading...</p>;
  if (stops.length === 0) return <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">No visits scheduled yet.</p>;

  return (
    <div className="space-y-2">
      {stops.map((s) => (
        <div key={s.id} className="rounded-[12px] border border-[var(--dash-border)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--dash-text)]">{fmtDate(s.route_date)}</span>
            <div className="flex items-center gap-1.5">
              {s.manual && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#EDE4FB", color: "#7C3AED" }}>
                  Manual
                </span>
              )}
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--dash-border-table)", color: "var(--dash-text-muted-2)" }}>
                {s.status}
              </span>
            </div>
          </div>
          {s.notes && <div className="mt-1 text-xs text-[var(--dash-text-secondary)]">{s.notes}</div>}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
    </div>
  );
}

function ClientInvoicesHistory({ clientId }: { clientId: string }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total || 0), 0);
  const totalOpen = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.total || 0), 0);

  return (
    <div className="mt-2 border-t border-[var(--dash-border)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--dash-text)]">Invoice History</h3>
        <div className="text-xs text-[var(--dash-text-muted)]">
          {invoices.length} total • <span className="font-semibold tabular-nums" style={{ color: "var(--dash-green)" }}>{fmt(totalPaid)} paid</span> • <span className="font-semibold tabular-nums" style={{ color: "var(--dash-badge-unpaid-text)" }}>{fmt(totalOpen)} open</span>
        </div>
      </div>
      {isLoading ? (
        <div className="py-4 text-center text-xs text-[var(--dash-text-muted)]">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--dash-border)] py-6 text-center text-xs text-[var(--dash-text-muted)]">
          No invoices yet for this client.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--dash-border-table)] text-left text-[var(--dash-text-muted)]">
                <th className="py-2 font-medium">Number</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Due</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--dash-border-table)]">
                  <td className="py-2 font-semibold text-[var(--dash-text)]">{inv.number}</td>
                  <td className="py-2 text-[var(--dash-text-secondary)]">{fmtDate(inv.invoice_date)}</td>
                  <td className="py-2 text-[var(--dash-text-secondary)]">{fmtDate(inv.due_date)}</td>
                  <td className="py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: inv.status === "PAID" ? "var(--dash-badge-paid-bg)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-bg)" : "var(--dash-badge-unpaid-bg)",
                        color: inv.status === "PAID" ? "var(--dash-badge-paid-text)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-text)" : "var(--dash-badge-unpaid-text)",
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[var(--dash-text)]">{fmt(Number(inv.total || 0))}</td>
                  <td className="py-2 text-right">
                    <Link to="/invoice" className="text-[var(--dash-link)] hover:text-[var(--dash-link-hover)] hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
