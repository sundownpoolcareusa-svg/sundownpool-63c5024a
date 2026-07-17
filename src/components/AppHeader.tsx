import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Search, FileText, Users, ClipboardList, Map, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AppLogo } from "./AppLogo";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/clientes", label: "Clients", icon: Users },
  { to: "/rotas", label: "Routes", icon: Map },
  { to: "/estimativa", label: "Estimates", icon: ClipboardList },
  { to: "/invoice", label: "Invoices", icon: FileText },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
    <header className="dash sticky top-0 z-30 border-b border-[var(--dash-border)] bg-white/82 backdrop-blur-[14px] lg:hidden print:hidden">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-4 py-2.5 sm:px-[22px]">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
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

        <div className="flex shrink-0 items-center gap-2">
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

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-[var(--dash-border)] p-3 lg:hidden">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold"
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
        </nav>
      )}
    </header>
  );
}
