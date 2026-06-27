import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Search, FileText, Users, ClipboardList, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AppLogo } from "./AppLogo";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/invoice", label: "INVOICE", icon: FileText },
  { to: "/clientes", label: "CLIENTES", icon: Users },
  { to: "/estimativa", label: "ESTIMATIVA", icon: ClipboardList },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const display = email ? email.split("@")[0] : "Usuário";
  const init = (email[0] || "U").toUpperCase();

  return (
    <header className="bg-[var(--brand-navy)] px-6 py-3">
      <div className="flex items-center justify-between gap-6">
        <AppLogo />
        <nav className="flex items-end gap-2">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-3 rounded-t-lg px-8 py-4 text-sm font-bold tracking-wide transition-colors ${
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
        <div className="flex items-center gap-5">
          <button className="text-white/90 hover:text-white"><Search className="h-5 w-5" /></button>
          <button className="relative text-white/90 hover:text-white"><Bell className="h-5 w-5" /></button>
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-blue)] text-sm font-bold uppercase">{init}</div>
              <div className="leading-tight text-left">
                <div className="text-sm font-semibold capitalize">{display}</div>
                <div className="text-xs text-white/70">Admin</div>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
