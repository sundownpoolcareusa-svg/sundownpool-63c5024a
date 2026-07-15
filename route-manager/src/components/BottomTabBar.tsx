import { Link, useLocation } from "react-router-dom";
import { Home, Map, Users, Menu } from "lucide-react";

const TABS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/rotas", label: "Rotas", icon: Map },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/mais", label: "Mais", icon: Menu },
] as const;

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--dash-border)] bg-white pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -1px 8px rgba(20,36,60,.05)" }}
    >
      {TABS.map((t) => {
        const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold"
            style={{ color: active ? "var(--dash-navy)" : "var(--dash-text-muted)" }}
          >
            <Icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
