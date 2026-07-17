import { Link } from "react-router-dom";
import { Users, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Sidebar } from "@/components/Sidebar";

export function More() {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-60">
      <Sidebar />
      <header className="px-4 pb-4 pt-5 text-white md:px-8" style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))" }}>
        <h1 className="text-lg font-extrabold">Mais</h1>
      </header>

      <div className="space-y-2.5 p-4 md:max-w-2xl md:px-8">
        <Link to="/mais/tecnicos" className="flex items-center justify-between rounded-[14px] border border-[var(--dash-border)] bg-white p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" style={{ color: "var(--dash-navy)" }} />
            <span className="font-semibold text-[var(--dash-text)]">Técnicos</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--dash-text-muted)]" />
        </Link>

        <button onClick={logout} className="flex w-full items-center gap-3 rounded-[14px] border p-4" style={{ borderColor: "var(--dash-red-border)" }}>
          <LogOut className="h-5 w-5" style={{ color: "var(--dash-red)" }} />
          <span className="font-semibold" style={{ color: "var(--dash-red)" }}>Sair</span>
        </button>
      </div>

      <BottomTabBar />
    </div>
  );
}
