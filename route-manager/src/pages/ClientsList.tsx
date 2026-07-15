import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { listClients } from "@/lib/db";
import { TechnicianAvatar } from "@/components/TechnicianAvatar";
import { BottomTabBar } from "@/components/BottomTabBar";

export function ClientsList() {
  const [search, setSearch] = useState("");
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });

  const filtered = clients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pb-4 pt-5 text-white" style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))" }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Clientes</h1>
          <Link to="/clientes/novo" aria-label="Novo cliente"><Plus className="h-5 w-5" /></Link>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clientes..."
            className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="mt-3 space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5">
              <TechnicianAvatar name={c.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[var(--dash-text)]">{c.name}</div>
                <div className="truncate text-xs text-[var(--dash-text-muted)]">{c.address}</div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-[var(--dash-text-muted)]">Nenhum cliente encontrado.</p>}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
