import { Link, useLocation } from "react-router-dom";
import { Waves } from "lucide-react";
import { TABS } from "./navTabs";

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col text-white md:flex"
      style={{ background: "linear-gradient(180deg, var(--dash-navy), var(--dash-navy-2))" }}
    >
      <div className="flex items-center gap-2 px-5 py-6 text-lg font-extrabold">
        <Waves className="h-6 w-6" />
        Pool Route Manager
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {TABS.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold"
              style={{
                background: active ? "rgba(255,255,255,.12)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,.65)",
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
