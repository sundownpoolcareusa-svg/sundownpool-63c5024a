import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Award, Users, DollarSign, BarChart3, FileText, ChevronDown, ChevronLeft, ChevronRight,
  Download, Plus, Bell, FlaskConical, Phone, MapPin, Play, Check,
  User, Zap, AlertTriangle, CheckCircle2, ClipboardList, UserPlus, CalendarX,
} from "lucide-react";
import {
  listClients, listInvoices, listEstimates, listRoutesForDate, listAllChemicalsHistory, listProductCosts,
  listTechnicians, updateStopStatus, clientFullAddress, fmt, fmtDate, initials, isReadingInRange,
  CHEMICAL_READING_META, type RouteRow, type StopStatus, type Client, type ChemicalReadingKey,
  type ChemicalVisitEntry,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import poolImg from "@/assets/pool.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

function todayDateStr() {
  const d = new Date();
  return dateStr(d);
}

function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ISO weekday (Monday=1..Sunday=7), used to find the Monday/Friday bounds of
// the current and previous week regardless of which day "today" falls on.
function isoDow(d: Date) {
  const g = d.getDay();
  return g === 0 ? 7 : g;
}

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setDate(d.getDate() - (isoDow(d) - 1));
  return m;
}

function fridayOf(d: Date) {
  const f = mondayOf(d);
  f.setDate(f.getDate() + 4);
  return f;
}

type ClientFull = { status: string; stage?: string; monthly_value?: number | null } & Record<string, unknown>;

function DashboardStat({
  icon: Icon, iconColor, iconBg, value, label, sub, subColor, footer,
}: {
  icon: typeof Users; iconColor: string; iconBg: string; value: string | number; label: string;
  sub: ReactNode; subColor?: string; footer?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[#E9EDF5] bg-white p-3.5" style={cardShadow}>
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: iconBg, color: iconColor }}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[20px] font-extrabold leading-none tracking-tight text-[var(--dash-text)]">{value}</div>
          <div className="mt-1 text-[13px] font-bold leading-tight text-[var(--dash-text)]">{label}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: subColor || "var(--dash-text-muted)" }}>{sub}</div>
        </div>
      </div>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

function ProgressFooter({ completed, remaining }: { completed: number; remaining: number }) {
  const total = completed + remaining;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--dash-border-table)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--dash-green)" }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11.5px] font-semibold">
        <span style={{ color: "var(--dash-green)" }}>{completed} completed</span>
        <span className="text-[var(--dash-text-muted)]">{remaining} remaining</span>
      </div>
    </div>
  );
}

const WEEKDAY_COLORS = [
  { name: "Monday", accent: "#2563EB", iconBg: "#DBEAFE" },
  { name: "Tuesday", accent: "#16A34A", iconBg: "#DCFCE7" },
  { name: "Wednesday", accent: "#F59E0B", iconBg: "#FFEDD5" },
  { name: "Thursday", accent: "#EF4444", iconBg: "#FEE2E2" },
  { name: "Friday", accent: "#7C3AED", iconBg: "#EDE4FB" },
];

type RouteStopAgg = { id: string; status: string; client: { monthly_value: number | null; service_days: string[] | null } | null };
type RouteAgg = { route_date: string; technician_id: string; technician: { id: string; name: string; color: string } | null; route_stops: RouteStopAgg[] | null };

type DayAgg = { pools: number; value: number; completed: number; remaining: number; tech: { name: string; color: string } | null };

function buildDayAgg(routes: RouteAgg[], dateForDay: string): DayAgg {
  const dayRoutes = routes.filter((r) => r.route_date === dateForDay);
  let pools = 0;
  let value = 0;
  let completed = 0;
  let bestTech: { name: string; color: string } | null = null;
  let bestCount = -1;
  for (const r of dayRoutes) {
    const stops = r.route_stops ?? [];
    pools += stops.length;
    for (const s of stops) {
      const days = s.client?.service_days?.length || 1;
      value += Number(s.client?.monthly_value || 0) / days;
      if (s.status === "Concluído") completed += 1;
    }
    if (stops.length > bestCount) {
      bestCount = stops.length;
      bestTech = r.technician ? { name: r.technician.name, color: r.technician.color } : null;
    }
  }
  return { pools, value, completed, remaining: Math.max(0, pools - completed), tech: bestTech };
}

function WeeklyRouteSection() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekMondayDate = (() => { const m = mondayOf(new Date()); m.setDate(m.getDate() + weekOffset * 7); return m; })();
  const weekMonday = dateStr(weekMondayDate);
  const weekFriday = dateStr((() => { const f = new Date(weekMondayDate); f.setDate(f.getDate() + 4); return f; })());

  const { data: weekDetailRoutes = [] } = useQuery({
    queryKey: ["routes-week-detail", weekMonday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("route_date, technician_id, technician:technicians(id,name,color), route_stops(id, status, client:clients(monthly_value, service_days))")
        .gte("route_date", weekMonday)
        .lte("route_date", weekFriday);
      if (error) throw error;
      return (data ?? []) as unknown as RouteAgg[];
    },
  });

  const weekDays = WEEKDAY_COLORS.map((c, i) => {
    const d = new Date(weekMondayDate);
    d.setDate(d.getDate() + i);
    return { ...c, dateForDay: dateStr(d) };
  });

  return (
    <div className="rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[var(--dash-text)]">Weekly Route</h2>
        <div className="flex items-center gap-3">
          <Link to="/rotas" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View Full Schedule</Link>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setWeekOffset((v) => v - 1)} aria-label="Previous week" className="grid h-7 w-7 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setWeekOffset((v) => v + 1)} aria-label="Next week" className="grid h-7 w-7 place-items-center rounded-full border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {weekDays.map((d) => {
          const agg = buildDayAgg(weekDetailRoutes, d.dateForDay);
          return (
            <div key={d.dateForDay} className="overflow-hidden rounded-[12px] border border-[var(--dash-border)]">
              <div className="h-[3px]" style={{ background: d.accent }} />
              <div className="p-3">
                <div className="text-[13px] font-extrabold" style={{ color: d.accent }}>{d.name}</div>
                <div className="text-base font-extrabold text-[var(--dash-text)]">{agg.pools} Pools</div>
                <div className="text-[12px] text-[var(--dash-text-secondary)]">{fmt(agg.value)} Route Value</div>

                <div className="mt-2 flex min-h-7 items-center gap-1.5">
                  {agg.tech ? (
                    <>
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: agg.tech.color }}>
                        {initials(agg.tech.name)}
                      </div>
                      <span className="truncate text-[12px] font-bold text-[var(--dash-text)]">{agg.tech.name}</span>
                    </>
                  ) : (
                    <span className="text-[12px] text-[var(--dash-text-muted)]">No technician assigned</span>
                  )}
                </div>

                <div className="mt-2">
                  <ProgressFooter completed={agg.completed} remaining={agg.remaining} />
                </div>

                <Link to="/rotas" className="mt-2 block w-full rounded-[9px] border border-[var(--dash-border)] py-1.5 text-center text-[12px] font-bold hover:bg-[var(--dash-bg)]" style={{ color: d.accent }}>
                  View Route
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Rounding to "$Xk" collapses distinct sub-$1000 values to the same label
// (e.g. every tick reading "$0k") — only abbreviate once the value is large
// enough for that to still be meaningful.
function axisFmt(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(v)}`;
}

function formatStopTime(t: string | null) {
  if (!t) return "Anytime";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

function LabelValueStat({
  icon: Icon, iconColor, iconBg, label, value, valueColor, sub,
}: {
  icon: typeof DollarSign; iconColor: string; iconBg: string; label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight text-[var(--dash-text-secondary)]">
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px]" style={{ background: iconBg, color: iconColor }}>
          <Icon className="h-2.5 w-2.5" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[17px] font-extrabold" style={{ color: valueColor || "var(--dash-text)" }}>{value}</div>
      {sub && <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{sub}</div>}
    </div>
  );
}

function ValueLabelStat({ value, valueColor, label }: { value: string; valueColor?: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[17px] font-extrabold" style={{ color: valueColor || "var(--dash-text)" }}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] font-medium text-[var(--dash-text-muted)] leading-tight">{label}</div>
    </div>
  );
}

function FinancialOverviewSection({ monthlyRevenue }: { monthlyRevenue: number }) {
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates });

  const now = new Date();
  const thisMonth = monthKey(now);
  const collected = invoices
    .filter((i) => i.status === "PAID" && (i.invoice_date || "").slice(0, 7) === thisMonth)
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const outstanding = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const openEstimates = estimates.filter((e) => e.status === "PENDENTE" || e.status === "ENVIADA");
  const openEstimatesTotal = openEstimates.reduce((s, e) => s + Number(e.total || 0), 0);

  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
  const chartData = months.map((d) => {
    const key = monthKey(d);
    const total = invoices
      .filter((i) => i.status === "PAID" && (i.invoice_date || "").slice(0, 7) === key)
      .reduce((s, i) => s + Number(i.total || 0), 0);
    return { month: d.toLocaleString("en-US", { month: "short" }), total };
  });

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Financial Overview</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LabelValueStat icon={DollarSign} iconColor="#0B63F6" iconBg="#DBEAFE" label="Monthly Revenue" value={fmt(monthlyRevenue)} />
        <LabelValueStat icon={CheckCircle2} iconColor="var(--dash-green)" iconBg="#DCFCE7" label="Collected" value={fmt(collected)} valueColor="var(--dash-green)" />
        <LabelValueStat icon={AlertTriangle} iconColor="var(--dash-red)" iconBg="#FEE2E2" label="Outstanding" value={fmt(outstanding)} valueColor={outstanding > 0 ? "var(--dash-red)" : undefined} />
        <LabelValueStat icon={ClipboardList} iconColor="#7C3AED" iconBg="#EDE4FB" label="Estimates Open" value={fmt(openEstimatesTotal)} sub={`${openEstimates.length} estimate${openEstimates.length === 1 ? "" : "s"}`} />
      </div>
      <div className="mt-3 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dash-border-table)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--dash-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--dash-text-muted)" }} axisLine={false} tickLine={false} width={40} tickFormatter={axisFmt} />
            <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: "var(--dash-bg)" }} />
            <Bar dataKey="total" name="Revenue" fill="#0B63F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const PRODUCT_COLORS = ["#0B63F6", "#16A34A", "#F59E0B", "#7C3AED", "#EF4444", "#6B7280"];

function ChemicalPerformanceSection({ monthlyRevenue }: { monthlyRevenue: number }) {
  const { data: chemHistory = [] } = useQuery({ queryKey: ["chemicals-history-all"], queryFn: listAllChemicalsHistory });
  const { data: productCosts = [] } = useQuery({ queryKey: ["product-costs"], queryFn: listProductCosts });

  const costByName = new Map(productCosts.map((c) => [c.product_name, Number(c.cost_per_unit)]));
  const thisMonth = monthKey(new Date());
  const entriesThisMonth = chemHistory.filter((e) => e.route_date.slice(0, 7) === thisMonth);

  const productTotals = new Map<string, { visits: number; cost: number }>();
  for (const entry of entriesThisMonth) {
    for (const p of entry.chemicals.products ?? []) {
      if (!p.qty || p.qty <= 0) continue;
      const cost = p.qty * (costByName.get(p.name) ?? 0);
      const cur = productTotals.get(p.name) ?? { visits: 0, cost: 0 };
      productTotals.set(p.name, { visits: cur.visits + 1, cost: cur.cost + cost });
    }
  }
  const chemicalCost = [...productTotals.values()].reduce((s, v) => s + v.cost, 0);
  const avgPerVisit = entriesThisMonth.length > 0 ? chemicalCost / entriesThisMonth.length : 0;
  const pctOfRevenue = monthlyRevenue > 0 ? (chemicalCost / monthlyRevenue) * 100 : 0;
  const sortedProducts = [...productTotals.entries()].sort((a, b) => b[1].visits - a[1].visits);
  const mostUsed = sortedProducts[0]?.[0] ?? "—";

  const sortedByCost = [...productTotals.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const top = sortedByCost.slice(0, 5);
  const rest = sortedByCost.slice(5);
  const restCost = rest.reduce((s, [, v]) => s + v.cost, 0);
  const donutData = [
    ...top.map(([name, v]) => ({ name, value: v.cost })),
    ...(restCost > 0 ? [{ name: "Other", value: restCost }] : []),
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Chemical Performance</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ValueLabelStat value={fmt(chemicalCost)} label="Chemical Cost This Month" />
        <ValueLabelStat value={fmt(avgPerVisit)} label="Average Cost per Visit" />
        <ValueLabelStat value={`${pctOfRevenue.toFixed(1)}%`} label="Chemical Cost of Revenue" />
        <ValueLabelStat value={mostUsed} valueColor="var(--dash-link)" label="Most Used Product" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-24 w-24 shrink-0">
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={46} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={d.name} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full border-2 border-dashed border-[var(--dash-border)] text-[10px] text-[var(--dash-text-muted)]">No data</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {donutData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2 text-[12px]">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }} />
                <span className="truncate font-medium text-[var(--dash-text-secondary)]">{d.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-bold text-[var(--dash-text)]">{fmt(d.value)}</span>
                <span className="w-9 text-right text-[11px] text-[var(--dash-text-muted)]">{chemicalCost > 0 ? `${((d.value / chemicalCost) * 100).toFixed(1)}%` : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Link
        to="/quimicos"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] border border-[var(--dash-border)] py-1.5 text-[13px] font-bold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]"
      >
        <FlaskConical className="h-3.5 w-3.5" /> View Chemical Report
      </Link>
    </div>
  );
}

function nextStopStatus(status: StopStatus): StopStatus | null {
  if (status === "Pendente") return "Em serviço";
  if (status === "Em serviço") return "Concluído";
  return null;
}

function stopDisplayStatus(status: StopStatus, isNext: boolean): { label: string; bg: string; text: string } {
  if (status === "Concluído") return { label: "Completed", bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" };
  if (status === "Em serviço") return { label: "In Progress", bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" };
  return isNext
    ? { label: "Next", bg: "#FFEDD5", text: "var(--dash-orange)" }
    : { label: "Scheduled", bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" };
}

function StopClientPhoto({ client }: { client: (Client & { pool_photos?: string[] | null }) | undefined }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = client?.pool_photos?.[0];
    if (!path) { setUrl(null); return; }
    let alive = true;
    supabase.storage.from("client-photos").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [client?.pool_photos]);
  return <img src={url || poolImg} alt="" className="h-9 w-9 shrink-0 rounded-[9px] object-cover" />;
}

function TodayServicesSection({ routes, todayStr }: { routes: RouteRow[]; todayStr: string }) {
  const qc = useQueryClient();
  const advance = useMutation({
    mutationFn: ({ stopId, status, clientId }: { stopId: string; status: StopStatus; clientId: string }) =>
      updateStopStatus(stopId, status, clientId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes-for-date", todayStr] }),
  });

  const stops = routes
    .flatMap((r) => (r.route_stops ?? []).map((s) => ({ ...s, technician: r.technician ?? null })))
    .sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return a.position - b.position;
    });
  const firstPendingId = stops.find((s) => s.status === "Pendente")?.id;

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Today's Services</h2>
        <Link to="/rotas" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View All</Link>
      </div>
      {stops.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--dash-text-muted)]">No stops scheduled for today.</p>
      ) : (
        <div className="mt-2 max-h-[340px] space-y-1 overflow-y-auto pr-1">
          {stops.map((stop) => {
            const client = stop.client as (Client & { monthly_value?: number | null; pool_photos?: string[] | null }) | undefined;
            const badge = stopDisplayStatus(stop.status, stop.id === firstPendingId);
            const next = nextStopStatus(stop.status);
            const address = client ? clientFullAddress(client) : "";
            return (
              <div key={stop.id} className="flex items-center gap-2.5 border-b border-[var(--dash-border)] py-2 last:border-0">
                <StopClientPhoto client={client} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[var(--dash-text)]">{formatStopTime(stop.scheduled_time)}</div>
                  <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{client?.name ?? "Unknown client"}</div>
                  <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{address || "No address"}{stop.technician ? ` · ${stop.technician.name}` : ""}</div>
                </div>
                <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-block" style={{ background: badge.bg, color: badge.text }}>{badge.label}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {client?.phone && (
                    <a href={`tel:${client.phone}`} className="grid h-7 w-7 place-items-center rounded-[8px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]" aria-label="Call">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank" rel="noreferrer"
                      className="hidden h-7 w-7 place-items-center rounded-[8px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)] md:grid" aria-label="Map"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!client) return;
                        if (next === "Concluído" && !confirm(`Mark ${client.name}'s visit as completed?`)) return;
                        advance.mutate({ stopId: stop.id, status: next, clientId: client.id });
                      }}
                      disabled={advance.isPending}
                      className="grid h-7 w-7 place-items-center rounded-[8px] text-white disabled:opacity-60"
                      style={{ background: next === "Concluído" ? "var(--dash-green)" : "var(--dash-navy)" }}
                      aria-label={next === "Concluído" ? "Complete" : "Start"}
                    >
                      {next === "Concluído" ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {client?.monthly_value != null && (
                  <span className="hidden w-14 shrink-0 text-right text-[13px] font-bold text-[var(--dash-navy)] lg:inline-block">{fmt(Number(client.monthly_value))}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type FeedItem = {
  id: string; icon: typeof AlertTriangle; iconColor: string; iconBg: string;
  title: string; subtitle: string; whenMs: number;
};

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CHEMICAL_KEYS: ChemicalReadingKey[] = ["free_chlorine", "ph", "total_alkalinity", "calcium_hardness", "stabilizer"];

// Out-of-range chemical readings are a real, defensible source of "alerts" —
// no fabricated weather/equipment/schedule events, only what the tech actually logged.
function buildChemicalAlerts(chemHistory: ChemicalVisitEntry[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const entry of chemHistory) {
    for (const key of CHEMICAL_KEYS) {
      const value = entry.chemicals[key];
      if (value == null || isReadingInRange(key, value)) continue;
      const meta = CHEMICAL_READING_META[key];
      const direction = value > meta.max ? "High" : "Low";
      const unitSuffix = meta.unit ? ` ${meta.unit}` : "";
      items.push({
        id: `${entry.route_stop_id}-${key}`,
        icon: AlertTriangle, iconColor: "var(--dash-orange)", iconBg: "#FFEDD5",
        title: `${direction} ${meta.label}`,
        subtitle: `${entry.client_name} · ${value}${unitSuffix} (target ${meta.min}-${meta.max}${unitSuffix})`,
        whenMs: new Date(`${entry.route_date}T12:00:00`).getTime(),
      });
    }
  }
  return items;
}

function FeedList({ items, emptyLabel }: { items: FeedItem[]; emptyLabel: string }) {
  if (items.length === 0) return <p className="mt-3 text-[13px] text-[var(--dash-text-muted)]">{emptyLabel}</p>;
  return (
    <div className="mt-2 flex-1 space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-start gap-2.5 border-b border-[var(--dash-border)] pb-2 last:border-0 last:pb-0">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: item.iconBg, color: item.iconColor }}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-bold text-[var(--dash-text)]">{item.title}</span>
                <span className="shrink-0 text-[10.5px] text-[var(--dash-text-muted)]">{timeAgo(item.whenMs)}</span>
              </div>
              <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{item.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentAlertsSection() {
  const { data: chemHistory = [] } = useQuery({ queryKey: ["chemicals-history-all"], queryFn: listAllChemicalsHistory });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });

  const todayStr = todayDateStr();
  const since = dateStr(new Date(Date.now() - 14 * 86400000));
  const { data: recentPastRoutes = [] } = useQuery({
    queryKey: ["routes-missed-service", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("route_date, technician:technicians(name), route_stops(id,status,client:clients(name))")
        .gte("route_date", since)
        .lt("route_date", todayStr);
      if (error) throw error;
      return (data ?? []) as {
        route_date: string; technician: { name: string } | null;
        route_stops: { id: string; status: string; client: { name: string } | null }[] | null;
      }[];
    },
  });

  const invoiceAlerts: FeedItem[] = invoices
    .filter((i) => i.status !== "PAID" && i.due_date && i.due_date < todayStr)
    .map((i) => ({
      id: `inv-${i.id}`, icon: DollarSign, iconColor: "var(--dash-red)", iconBg: "#FEE2E2",
      title: "Invoice Overdue",
      subtitle: `${i.client?.name ?? "Client"} · ${fmt(Number(i.total))} due ${fmtDate(i.due_date)}`,
      whenMs: new Date(`${i.due_date}T12:00:00`).getTime(),
    }));

  const missedServiceAlerts: FeedItem[] = recentPastRoutes.flatMap((r) =>
    (r.route_stops ?? [])
      .filter((s) => s.status !== "Concluído")
      .map((s) => ({
        id: `missed-${s.id}`,
        icon: CalendarX, iconColor: "var(--dash-red)", iconBg: "#FEE2E2",
        title: "Missed Service",
        subtitle: `${s.client?.name ?? "Client"} · ${r.technician?.name ?? "Technician"} did not complete the ${fmtDate(r.route_date)} visit`,
        whenMs: new Date(`${r.route_date}T12:00:00`).getTime(),
      })),
  );

  const alerts = [...invoiceAlerts, ...missedServiceAlerts, ...buildChemicalAlerts(chemHistory)]
    .sort((a, b) => b.whenMs - a.whenMs)
    .slice(0, 3);

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
          <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Recent Alerts</h2>
        </div>
        <Link to="/quimicos" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View All</Link>
      </div>
      <FeedList items={alerts} emptyLabel="No active alerts — everything looks good." />
      <Link to="/quimicos" className="mt-3 block w-full rounded-[9px] border border-[var(--dash-border)] py-1.5 text-center text-[13px] font-bold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]">
        View All Alerts
      </Link>
    </div>
  );
}

function TopTechniciansSection() {
  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });

  const now = new Date();
  const weekStart = dateStr(mondayOf(now));
  const weekEnd = dateStr(fridayOf(now));
  const { data: weekRoutes = [] } = useQuery({
    queryKey: ["routes-week-tech", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("technician_id, route_stops(id, status, client:clients(monthly_value, service_days))")
        .gte("route_date", weekStart)
        .lte("route_date", weekEnd);
      if (error) throw error;
      return (data ?? []) as { technician_id: string; route_stops: RouteStopAgg[] | null }[];
    },
  });

  const stats = technicians
    .map((t) => {
      const stops = weekRoutes.filter((r) => r.technician_id === t.id).flatMap((r) => r.route_stops ?? []);
      const total = stops.length;
      const completed = stops.filter((s) => s.status === "Concluído").length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const routeValue = stops.reduce((s, stop) => {
        const days = stop.client?.service_days?.length || 1;
        return s + Number(stop.client?.monthly_value || 0) / days;
      }, 0);
      return { technician: t, total, completed, pct, routeValue };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.pct - a.pct || b.total - a.total)
    .slice(0, 2);

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
          <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Top Technicians</h2>
        </div>
        <Link to="/tecnicos" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View All</Link>
      </div>
      {stats.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--dash-text-muted)]">No completed stops yet this week.</p>
      ) : (
        <div className="mt-2 flex-1 space-y-2.5">
          {stats.map((s) => (
            <div key={s.technician.id}>
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: s.technician.color }}>
                  {initials(s.technician.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold text-[var(--dash-text)]">{s.technician.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold" style={{ color: "var(--dash-green)" }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--dash-green)" }} /> Active
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--dash-text-muted)]">{s.total} pools this week · {fmt(s.routeValue)} route value</div>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--dash-border-table)" }}>
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "var(--dash-green)" }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                <span style={{ color: "var(--dash-green)" }}>{s.completed} / {s.total} completed on time</span>
                <span className="text-[var(--dash-text-muted)]">{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link to="/tecnicos" className="mt-3 block w-full rounded-[9px] border border-[var(--dash-border)] py-1.5 text-center text-[13px] font-bold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]">
        View All Technicians
      </Link>
    </div>
  );
}

const AVATAR_PALETTE = ["#0B63F6", "#16A34A", "#F59E0B", "#7C3AED", "#EF4444", "#0EA5E9"];

function NewClientsSection() {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const thisMonth = monthKey(new Date());
  const newClients = clients
    .filter((c) => (c.created_at || "").slice(0, 7) === thisMonth && c.stage !== "Prospecção")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const addedRevenue = newClients.reduce((s, c) => s + Number((c as ClientFull).monthly_value || 0), 0);

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
          <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">New Clients This Month</h2>
        </div>
        <Link to="/clientes" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View All</Link>
      </div>
      <div className="mt-2 flex items-center gap-5">
        <div>
          <div className="text-[17px] font-extrabold text-[var(--dash-text)]">{newClients.length}</div>
          <div className="text-[11px] text-[var(--dash-text-muted)]">New Clients</div>
        </div>
        <div>
          <div className="text-[17px] font-extrabold" style={{ color: "var(--dash-green)" }}>{fmt(addedRevenue)}</div>
          <div className="text-[11px] text-[var(--dash-text-muted)]">Added Monthly Revenue</div>
        </div>
      </div>
      {newClients.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--dash-text-muted)]">No new clients yet this month.</p>
      ) : (
        <div className="mt-2 flex-1 space-y-2">
          {newClients.slice(0, 3).map((c, i) => (
            <div key={c.id} className="flex items-center gap-2.5 border-b border-[var(--dash-border)] pb-2 last:border-0 last:pb-0">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}>
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-[var(--dash-text)]">{c.name}</div>
                <div className="truncate text-[11px] text-[var(--dash-text-muted)]">{[c.city, c.state].filter(Boolean).join(", ")}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-bold text-[var(--dash-text)]">{fmt(Number((c as ClientFull).monthly_value || 0))}/mo</div>
                <div className="text-[10.5px] text-[var(--dash-text-muted)]">{fmtDate(c.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link to="/clientes" className="mt-3 block w-full rounded-[9px] border border-[var(--dash-border)] py-1.5 text-center text-[13px] font-bold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]">
        View All New Clients
      </Link>
    </div>
  );
}

function RecentActivitySection() {
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: chemHistory = [] } = useQuery({ queryKey: ["chemicals-history-all"], queryFn: listAllChemicalsHistory });
  const { data: recentRoutes = [] } = useQuery({
    queryKey: ["routes-recent-activity"],
    queryFn: async () => {
      const since = dateStr(new Date(Date.now() - 14 * 86400000));
      const { data, error } = await supabase
        .from("routes")
        .select("id, technician:technicians(id,name,color), route_stops(id,status,completed_at)")
        .gte("route_date", since);
      if (error) throw error;
      return (data ?? []) as {
        id: string; technician: { id: string; name: string; color: string } | null;
        route_stops: { id: string; status: string; completed_at: string | null }[] | null;
      }[];
    },
  });

  const routeEvents: FeedItem[] = [];
  for (const r of recentRoutes) {
    const stops = r.route_stops ?? [];
    if (stops.length === 0 || !stops.every((s) => s.status === "Concluído")) continue;
    const last = stops.reduce((max, s) => (s.completed_at && s.completed_at > max ? s.completed_at : max), "");
    if (!last) continue;
    routeEvents.push({
      id: `route-${r.id}`, icon: CheckCircle2, iconColor: "var(--dash-green)", iconBg: "#DCFCE7",
      title: "Route completed",
      subtitle: `${r.technician?.name ?? "Technician"} completed ${stops.length} pool${stops.length === 1 ? "" : "s"}`,
      whenMs: new Date(last).getTime(),
    });
  }

  const invoiceEvents: FeedItem[] = invoices.map((i) => ({
    id: `inv-${i.id}`, icon: FileText, iconColor: "var(--dash-link)", iconBg: "#DBEAFE",
    title: "Invoice created",
    subtitle: `#${i.number} · ${i.client?.name ?? "Client"} · ${fmt(Number(i.total))}`,
    whenMs: new Date(i.created_at).getTime(),
  }));

  const events = [...routeEvents, ...invoiceEvents, ...buildChemicalAlerts(chemHistory)]
    .sort((a, b) => b.whenMs - a.whenMs)
    .slice(0, 3);

  return (
    <div className="flex flex-col rounded-[16px] border border-[#E9EDF5] bg-white p-4" style={cardShadow}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4" style={{ color: "var(--dash-navy)" }} />
          <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Recent Activity</h2>
        </div>
        <Link to="/rotas" className="text-[13px] font-semibold" style={{ color: "var(--dash-link)" }}>View All</Link>
      </div>
      <FeedList items={events} emptyLabel="No recent activity." />
    </div>
  );
}

function DashboardPage() {
  const [email, setEmail] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });

  const todayStr = todayDateStr();
  const { data: todayRoutes = [] } = useQuery({ queryKey: ["routes-for-date", todayStr], queryFn: () => listRoutesForDate(todayStr) });

  const now = new Date();
  const thisMonday = dateStr(mondayOf(now));
  const thisFriday = dateStr(fridayOf(now));
  const lastMonday = (() => { const m = mondayOf(now); m.setDate(m.getDate() - 7); return dateStr(m); })();
  const lastFriday = (() => { const f = fridayOf(now); f.setDate(f.getDate() - 7); return dateStr(f); })();

  const { data: weekRoutes = [] } = useQuery({
    queryKey: ["routes-week", thisMonday],
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("route_date, route_stops(id)").gte("route_date", thisMonday).lte("route_date", thisFriday);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: lastWeekRoutes = [] } = useQuery({
    queryKey: ["routes-week", lastMonday],
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("route_date, route_stops(id)").gte("route_date", lastMonday).lte("route_date", lastFriday);
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayRouteCount = todayRoutes.reduce((s, r) => s + (r.route_stops?.length ?? 0), 0);
  const todayCompletedCount = todayRoutes.reduce((s, r) => s + (r.route_stops ?? []).filter((st) => st.status === "Concluído").length, 0);
  const todayRemainingCount = Math.max(0, todayRouteCount - todayCompletedCount);
  const todayTechnicianCount = new Set(todayRoutes.filter((r) => (r.route_stops?.length ?? 0) > 0).map((r) => r.technician_id)).size;

  const poolsThisWeek = weekRoutes.reduce((s, r) => s + ((r as { route_stops?: { id: string }[] }).route_stops?.length ?? 0), 0);
  const poolsLastWeek = lastWeekRoutes.reduce((s, r) => s + ((r as { route_stops?: { id: string }[] }).route_stops?.length ?? 0), 0);
  const weekDelta = poolsThisWeek - poolsLastWeek;

  const activeClients = clients.filter((c) => c.status === "Ativo" && c.stage !== "Prospecção");
  const monthlyRevenue = activeClients.reduce((s, c) => s + Number((c as ClientFull).monthly_value || 0), 0);
  const avgPerPool = activeClients.length > 0 ? monthlyRevenue / activeClients.length : 0;

  const overdueInvoices = invoices.filter((i) => i.status !== "PAID" && i.due_date && i.due_date < todayStr);
  const invoicesDueCount = overdueInvoices.length;
  const invoicesDueAmount = overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = email ? email.split("@")[0].split(/[._]/)[0] : "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-extrabold text-[var(--dash-text)]">{greeting}, {displayName}</h1>
            <p className="text-[13px] text-[var(--dash-text-muted)]">Here's what's happening with your pool business today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]">
              This Month <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]">
              <Download className="h-4 w-4" /> Export Report
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-1.5 text-[13px] font-semibold text-white">
                <Plus className="h-4 w-4" /> Quick Add <ChevronDown className="h-4 w-4" />
              </button>
              <div className="invisible absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-[10px] border border-[var(--dash-border)] bg-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                <Link to="/clientes" className="block px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">New Client</Link>
                <Link to="/invoice" className="block px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">New Invoice</Link>
                <Link to="/estimativa" className="block px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">New Estimate</Link>
              </div>
            </div>
            <Link to="/invoice" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary)]" aria-label="Invoices due">
              <Bell className="h-4 w-4" />
              {invoicesDueCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--dash-red)] px-1 text-[10px] font-bold text-white">
                  {invoicesDueCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardStat
            icon={Award} iconColor="#0B63F6" iconBg="#DBEAFE"
            value={todayRouteCount} label="Pools Today"
            sub={`${todayTechnicianCount} technician${todayTechnicianCount === 1 ? "" : "s"}`}
            footer={<ProgressFooter completed={todayCompletedCount} remaining={todayRemainingCount} />}
          />
          <DashboardStat
            icon={Users} iconColor="var(--dash-green)" iconBg="#DCFCE7"
            value={poolsThisWeek} label="Pools This Week"
            sub="Monday through Friday"
            footer={
              <div className="text-[13px] font-semibold" style={{ color: weekDelta >= 0 ? "var(--dash-green)" : "var(--dash-red)" }}>
                {weekDelta >= 0 ? "+" : ""}{weekDelta} from last week
              </div>
            }
          />
          <DashboardStat
            icon={DollarSign} iconColor="var(--dash-orange)" iconBg="#FFEDD5"
            value={fmt(monthlyRevenue)} label="Monthly Route Revenue"
            sub="Expected recurring revenue"
          />
          <DashboardStat
            icon={BarChart3} iconColor="#7C3AED" iconBg="#EDE4FB"
            value={fmt(avgPerPool)} label="Average per Pool"
            sub={<>Based on <b>{activeClients.length}</b> active clients</>}
          />
          <DashboardStat
            icon={FileText} iconColor="var(--dash-red)" iconBg="#FEE2E2"
            value={invoicesDueCount} label="Invoices Due"
            sub={invoicesDueCount > 0 ? `${fmt(invoicesDueAmount)} outstanding` : "All caught up"}
            subColor={invoicesDueCount > 0 ? "var(--dash-red)" : "var(--dash-green)"}
            footer={
              <Link to="/invoice" className="block w-full rounded-[9px] border border-[var(--dash-border)] py-1.5 text-center text-[13px] font-semibold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]">
                View Invoices
              </Link>
            }
          />
        </div>

        <WeeklyRouteSection />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <FinancialOverviewSection monthlyRevenue={monthlyRevenue} />
          <ChemicalPerformanceSection monthlyRevenue={monthlyRevenue} />
          <TodayServicesSection routes={todayRoutes} todayStr={todayStr} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RecentAlertsSection />
          <TopTechniciansSection />
          <NewClientsSection />
          <RecentActivitySection />
        </div>
      </main>
    </div>
  );
}
