import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell, Search, FileText, Users, UserPlus, ClipboardList, Map, ChevronDown, LogOut, X, LayoutDashboard,
  Home, Route as RouteIcon, Plus, Menu, HardHat, FlaskConical,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AppLogo } from "./AppLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clients", icon: Users },
  { to: "/rotas", label: "Routes", icon: Map },
  { to: "/estimativa", label: "Estimates", icon: ClipboardList },
  { to: "/invoice", label: "Invoices", icon: FileText },
] as const;

// Everything reachable from the mobile bottom nav's "Mais" sheet — the same
// set of sections as the desktop sidebar, since mobile has no room to show
// them all as direct tabs.
const allTabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clients", icon: Users },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/rotas", label: "Routes", icon: Map },
  { to: "/tecnicos", label: "Users", icon: HardHat },
  { to: "/quimicos", label: "Chemicals", icon: FlaskConical },
  { to: "/estimativa", label: "Estimates", icon: ClipboardList },
  { to: "/invoice", label: "Invoices", icon: FileText },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const display = email ? email.split("@")[0] : "User";
  const init = (email[0] || "U").toUpperCase();

  return (
    <>
      <header className="dash sticky top-0 z-30 border-b border-[var(--dash-border)] bg-white/82 backdrop-blur-[14px] lg:hidden print:hidden">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-4 py-2.5 sm:px-[22px]">
          <div className="flex min-w-0 items-center gap-2">
            <AppLogo className="h-[42px]" />
          </div>

          <nav className="hidden items-center gap-[5px] rounded-[14px] bg-[#EEF2F7] p-[5px] lg:mx-auto lg:flex">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex items-center gap-2 rounded-[11px] px-[15px] py-[9px] text-sm font-semibold transition-all"
                  style={{
                    color: active ? "var(--dash-navy)" : "var(--dash-text-secondary-2)",
                    background: active ? "#fff" : "transparent",
                    boxShadow: active ? "0 1px 4px rgba(12,42,77,.16)" : "none",
                  }}
                >
                  <Icon className="h-[17px] w-[17px]" />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="hidden h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary-2)] sm:flex">
              <Search className="h-[17px] w-[17px]" />
            </button>
            <button className="relative hidden h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary-2)] sm:flex">
              <Bell className="h-[17px] w-[17px]" />
              <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[var(--dash-orange)]" />
            </button>
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-white py-1 pl-1 pr-2.5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--dash-navy)] text-sm font-bold uppercase text-white">{init}</div>
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-[13px] font-bold capitalize text-[var(--dash-text)]">{display}</div>
                  <div className="text-[11px] font-medium text-[var(--dash-text-muted-2)]">Admin</div>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-[var(--dash-text-muted-2)] sm:block" />
              </button>
              {open && (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-md border border-[var(--dash-border)] bg-white shadow-lg">
                  <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE bottom nav — replaces the old hamburger drawer app-wide */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--dash-border)] bg-white px-2 py-2 lg:hidden print:hidden"
        style={{ willChange: "transform" }}
      >
        <Link
          to="/dashboard"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-bold"
          style={{ color: pathname.startsWith("/dashboard") ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <Home className="h-5 w-5" />
          Início
        </Link>
        <Link
          to="/rotas"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-bold"
          style={{ color: pathname.startsWith("/rotas") ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <RouteIcon className="h-5 w-5" />
          Rota
        </Link>
        <button
          onClick={() => toast.info("Em breve")}
          className="-mt-6 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg"
          style={{ background: "var(--dash-navy)" }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <Link
          to="/clientes"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-bold"
          style={{ color: pathname.startsWith("/clientes") ? "var(--dash-navy)" : "var(--dash-text-muted-2)" }}
        >
          <Users className="h-5 w-5" />
          Clientes
        </Link>
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-bold"
          style={{ color: "var(--dash-text-muted-2)" }}
        >
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="dash absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--dash-text)]">Menu</h2>
              <button onClick={() => setMoreOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-[var(--dash-text-secondary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {allTabs.map((t) => {
                const active = pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
                    style={{
                      color: active ? "var(--dash-navy)" : "var(--dash-text-secondary-2)",
                      background: active ? "#EEF2F7" : "transparent",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    {t.label}
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="mt-1 flex items-center gap-3 rounded-xl border-t border-[var(--dash-border)] px-4 pt-3 pb-1 text-sm font-semibold text-[var(--dash-text-secondary)]"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
