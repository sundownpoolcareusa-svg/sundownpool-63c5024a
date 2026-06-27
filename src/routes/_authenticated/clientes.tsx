import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import {
  Plus, Search, Filter, Upload, ChevronDown, Calendar, Eye, MoreVertical, Smartphone, Share2,
  ChevronLeft, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

const summary = [
  { label: "Total de Clientes", value: "128", color: "text-slate-900" },
  { label: "Clientes Ativos", value: "96", color: "text-green-600" },
  { label: "Novos este mês", value: "7", color: "text-[var(--brand-blue)]" },
  { label: "Serviços este mês", value: "42", color: "text-amber-600" },
];

const upcoming = [
  { date: "Amanhã, 28 de Jun", client: "John Smith", tag: "Limpeza", tagClass: "bg-sky-100 text-sky-700" },
  { date: "30 de Jun, Seg", client: "Maria Oliveira", tag: "Manutenção", tagClass: "bg-green-100 text-green-700" },
  { date: "01 de Jul, Ter", client: "Robert Johnson", tag: "Reparo", tagClass: "bg-orange-100 text-orange-700" },
  { date: "02 de Jul, Qua", client: "Lisa Anderson", tag: "Limpeza", tagClass: "bg-sky-100 text-sky-700" },
  { date: "03 de Jul, Qui", client: "Carlos Mendes", tag: "Manutenção", tagClass: "bg-green-100 text-green-700" },
];

const clients = [
  { i: "JS", c: "bg-sky-200 text-sky-800",   name: "John Smith",     phone: "(407) 555-1234", email: "john.smith@email.com",  addr: "123 Lakeview Dr",     city: "Orlando, FL 32801", last: "20 de Jun, 2025", lastType: "Limpeza da Piscina", next: "27 de Jun, 2025", nextType: "Manutenção", status: "Ativo" },
  { i: "MO", c: "bg-orange-200 text-orange-800", name: "Maria Oliveira", phone: "(407) 555-5678", email: "maria.o@email.com",   addr: "456 Palm Ave",        city: "Orlando, FL 32803", last: "18 de Jun, 2025", lastType: "Manutenção", next: "30 de Jun, 2025", nextType: "Limpeza", status: "Ativo" },
  { i: "RJ", c: "bg-purple-200 text-purple-800", name: "Robert Johnson", phone: "(407) 555-8765", email: "robert.j@email.com",  addr: "789 Sunnybrook Ln",   city: "Orlando, FL 32804", last: "15 de Jun, 2025", lastType: "Reparo de Bomba", next: "01 de Jul, 2025", nextType: "Verificação", status: "Ativo" },
  { i: "LA", c: "bg-yellow-200 text-yellow-800", name: "Lisa Anderson",  phone: "(407) 555-2468", email: "lisa.a@email.com",    addr: "321 Waterfall Way",   city: "Orlando, FL 32805", last: "10 de Jun, 2025", lastType: "Limpeza", next: "02 de Jul, 2025", nextType: "Manutenção", status: "Ativo" },
  { i: "CM", c: "bg-pink-200 text-pink-800",   name: "Carlos Mendes",  phone: "(407) 555-1357", email: "carlos.m@email.com",  addr: "654 Blue Water Ct",   city: "Orlando, FL 32806", last: "05 de Jun, 2025", lastType: "Manutenção", next: "03 de Jul, 2025", nextType: "Limpeza", status: "Ativo" },
  { i: "EB", c: "bg-green-200 text-green-800", name: "Emily Brown",    phone: "(407) 555-9753", email: "emily.b@email.com",   addr: "987 Crystal Clear Dr",city: "Orlando, FL 32807", last: "28 de Mai, 2025", lastType: "Limpeza", next: "—", nextType: "Não agendado", status: "Inativo" },
  { i: "DW", c: "bg-cyan-200 text-cyan-800",   name: "David Wilson",   phone: "(407) 555-8642", email: "david.w@email.com",   addr: "159 Ocean Breeze St", city: "Orlando, FL 32808", last: "22 de Mai, 2025", lastType: "Reparo de Filtro", next: "—", nextType: "Não agendado", status: "Inativo" },
  { i: "SG", c: "bg-amber-200 text-amber-800", name: "Sophia Garcia",  phone: "(407) 555-7531", email: "sophia.g@email.com",  addr: "753 Aqua Lane",       city: "Orlando, FL 32809", last: "19 de Mai, 2025", lastType: "Manutenção", next: "—", nextType: "Não agendado", status: "Ativo" },
];

function ClientesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="grid grid-cols-12 gap-5 p-5">
        {/* SIDEBAR */}
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
            <button className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow">
              <Plus className="h-4 w-4" /> Novo Cliente
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input placeholder="Buscar clientes..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="border-b pb-2 font-bold text-slate-900">Resumo</div>
            <div className="mt-3 space-y-2.5 text-sm">
              {summary.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-slate-600">{s.label}</span>
                  <span className={`font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900">Próximos Serviços</div>
              <a className="text-xs font-semibold text-[var(--brand-blue)]">Ver todos</a>
            </div>
            <div className="mt-3 space-y-3">
              {upcoming.map((u) => (
                <div key={u.client} className="flex items-center justify-between text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div className="leading-tight">
                      <div className="text-slate-900">{u.date}</div>
                      <div className="text-slate-600">{u.client}</div>
                    </div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${u.tagClass}`}>{u.tag}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-[var(--brand-blue)]" />
              <div>
                <div className="font-bold text-slate-900">Cliente Portal</div>
                <p className="mt-1 text-xs text-slate-600">Seus clientes podem agendar serviços, ver histórico e receber faturas.</p>
              </div>
            </div>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--brand-blue)]/30 bg-white py-2 text-sm font-semibold text-[var(--brand-blue)]">
              <Share2 className="h-4 w-4" /> Compartilhar Link
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="col-span-9 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-900">Lista de Clientes</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                Todos os status <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <Filter className="h-4 w-4 text-[var(--brand-blue)]" /> Filtrar <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <Upload className="h-4 w-4 text-[var(--brand-blue)]" /> Exportar
              </button>
            </div>
          </div>

          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-3 font-medium">Cliente</th>
                <th className="py-3 font-medium">Contato</th>
                <th className="py-3 font-medium">Endereço</th>
                <th className="py-3 font-medium">Último Serviço</th>
                <th className="py-3 font-medium">Próximo Serviço</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.name} className="border-b border-slate-100">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${c.c}`}>{c.i}</div>
                      <div className="leading-tight">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">Residencial</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="text-slate-900">{c.phone}</div>
                    <div className="text-xs text-[var(--brand-blue)]">{c.email}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-slate-900">{c.addr}</div>
                    <div className="text-xs text-slate-500">{c.city}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-slate-900">{c.last}</div>
                    <div className="text-xs text-slate-500">{c.lastType}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-slate-900">{c.next}</div>
                    <div className="text-xs text-slate-500">{c.nextType}</div>
                  </td>
                  <td className="py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{c.status}</span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3 text-[var(--brand-blue)]">
                      <Eye className="h-4 w-4 cursor-pointer" />
                      <Calendar className="h-4 w-4 cursor-pointer" />
                      <MoreVertical className="h-4 w-4 cursor-pointer text-slate-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex items-center justify-between text-sm">
            <div className="text-slate-500">Mostrando 1 a 8 de 128 clientes</div>
            <div className="flex items-center gap-1">
              <button className="grid h-8 w-8 place-items-center rounded border border-slate-200"><ChevronLeft className="h-4 w-4" /></button>
              {["1", "2", "3", "...", "16"].map((p, idx) => (
                <button key={idx} className={`grid h-8 min-w-8 place-items-center rounded border px-2 ${p === "1" ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white" : "border-slate-200 text-slate-700"}`}>{p}</button>
              ))}
              <button className="grid h-8 w-8 place-items-center rounded border border-slate-200"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
