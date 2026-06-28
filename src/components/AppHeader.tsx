import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Search, FileText, Users, ClipboardList, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AppLogo } from "./AppLogo";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/invoice", label: "INVOICES", icon: FileText },
  { to: "/clientes", label: "CLIENTS", icon: Users },
  { to: "/estimativa", label: "ESTIMATES", icon: ClipboardList },
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
    <header className="bg-[var(--brand-navy)] px-4 py-3 sm:px-6 print:hidden">
      <div className="flex items-center justify-between gap-3 lg:gap-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-white hover:bg-white/10 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <AppLogo className="h-10 sm:h-12 lg:h-16" />
        </div>

        <nav className="hidden items-end gap-2 lg:flex">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-3 rounded-t-lg px-6 py-4 text-sm font-bold tracking-wide transition-colors xl:px-8 ${
                  active
                    ? "bg-white text-[var(--brand-blue)] shadow"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <button className="hidden text-white/90 hover:text-white sm:block"><Search className="h-5 w-5" /></button>
          <button className="hidden text-white/90 hover:text-white sm:block"><Bell className="h-5 w-5" /></button>
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-white">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-sm font-bold uppercase sm:h-10 sm:w-10">{init}</div>
              <div className="hidden leading-tight text-left sm:block">
                <div className="text-sm font-semibold capitalize">{display}</div>
                <div className="text-xs text-white/70">Admin</div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-white/70 sm:block" />
            </button>
            {open && (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav className="mt-3 flex flex-col gap-1 lg:hidden">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold tracking-wide ${
                  active ? "bg-white text-[var(--brand-blue)]" : "bg-white/5 text-white hover:bg-white/10"
                }`}
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
