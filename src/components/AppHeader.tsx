import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search, FileText, Users, ClipboardList, ChevronDown } from "lucide-react";
import { AppLogo } from "./AppLogo";

const tabs = [
  { to: "/invoice", label: "INVOICE", icon: FileText },
  { to: "/clientes", label: "CLIENTES", icon: Users },
  { to: "/estimativa", label: "ESTIMATIVA", icon: ClipboardList },
] as const;

export function AppHeader({ showBellBadge = true }: { showBellBadge?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
          <button className="relative text-white/90 hover:text-white">
            <Bell className="h-5 w-5" />
            {showBellBadge && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
            )}
          </button>
          <div className="flex items-center gap-2 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-blue)] text-sm font-bold">MO</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Melissa Oliveira</div>
              <div className="text-xs text-white/70">Admin</div>
            </div>
            <ChevronDown className="h-4 w-4 text-white/70" />
          </div>
        </div>
      </div>
    </header>
  );
}
