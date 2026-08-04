import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserPlus, Map, ClipboardList, FileText, HardHat, FlaskConical, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLogo } from "./AppLogo";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clients", icon: Users },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/rotas", label: "Routes", icon: Map },
  { to: "/tecnicos", label: "Users", icon: HardHat },
  { to: "/quimicos", label: "Chemicals", icon: FlaskConical },
  { to: "/estimativa", label: "Estimates", icon: ClipboardList },
  { to: "/invoice", label: "Invoices", icon: FileText },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const display = email ? email.split("@")[0] : "User";
  const init = (email[0] || "U").toUpperCase();

  return (
    <aside className="dash fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--dash-border)] bg-white lg:flex print:hidden">
      <div className="flex items-center px-5 py-5">
        <AppLogo className="h-9" />
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: active ? "var(--dash-water-bg)" : "transparent",
                color: active ? "var(--dash-navy)" : "var(--dash-text-secondary-2)",
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--dash-border)] p-3">
        <div className="flex items-center gap-2 rounded-[10px] px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--dash-navy)] text-sm font-bold uppercase text-white">
            {init}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-bold capitalize text-[var(--dash-text)]">
              {display}
            </div>
            <div className="text-[11px] font-medium text-[var(--dash-text-muted-2)]">Admin</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
