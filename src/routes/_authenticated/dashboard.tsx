import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Award, Users, DollarSign, BarChart3, FileText, ChevronDown, Download, Plus, Bell,
} from "lucide-react";
import { listClients, listInvoices, listRoutesForDate, fmt } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="rounded-[18px] border border-[#E9EDF5] bg-white p-5" style={cardShadow}>
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: iconBg, color: iconColor }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[26px] font-extrabold leading-none tracking-tight text-[var(--dash-text)]">{value}</div>
          <div className="mt-1.5 text-[15px] font-bold leading-tight text-[var(--dash-text)]">{label}</div>
          <div className="mt-1 text-[13px] font-semibold" style={{ color: subColor || "var(--dash-text-muted)" }}>{sub}</div>
        </div>
      </div>
      {footer && <div className="mt-3">{footer}</div>}
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
      <div className="mt-1.5 flex items-center justify-between text-[13px] font-semibold">
        <span style={{ color: "var(--dash-green)" }}>{completed} completed</span>
        <span className="text-[var(--dash-text-muted)]">{remaining} remaining</span>
      </div>
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
      <main className="space-y-5 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold text-[var(--dash-text)]">{greeting}, {displayName}</h1>
            <p className="text-sm text-[var(--dash-text-muted)]">Here's what's happening with your pool business today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">
              This Month <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">
              <Download className="h-4 w-4" /> Export Report
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white">
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
              <Link to="/invoice" className="block w-full rounded-[10px] border border-[var(--dash-border)] py-2 text-center text-sm font-semibold text-[var(--dash-text)] hover:bg-[var(--dash-bg)]">
                View Invoices
              </Link>
            }
          />
        </div>
      </main>
    </div>
  );
}
