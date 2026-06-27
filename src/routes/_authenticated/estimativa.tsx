import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { DocCardHeader } from "@/components/InvoiceCard";
import {
  Plus, Search, Filter, FileText, Mail, Download, MoreHorizontal, User, MapPin,
  Wrench, Grid3x3, Trash2, FlaskConical, Droplet, CheckCircle2, Pencil,
  ListChecks, CalendarDays, Clock, ShieldCheck, Phone,
} from "lucide-react";
import poolImg from "@/assets/pool.jpg";

export const Route = createFileRoute("/_authenticated/estimativa")({
  component: EstimativaPage,
});

const tabs = ["Todas", "Pendentes", "Enviadas", "Aprovadas", "Expiradas"];

const estimates = [
  { id: "EST-2025-031", client: "John Smith",     svc: "Limpeza e Manutenção da Piscina", date: "26 de Jun, 2025", amount: "$725.00", status: "PENDENTE", active: true },
  { id: "EST-2025-030", client: "Maria Oliveira", svc: "Reparo de Bomba",                  date: "24 de Jun, 2025", amount: "$560.00", status: "APROVADA" },
  { id: "EST-2025-029", client: "Robert Johnson", svc: "Troca de Filtro",                   date: "23 de Jun, 2025", amount: "$450.00", status: "ENVIADA" },
  { id: "EST-2025-028", client: "Lisa Anderson",  svc: "Limpeza Completa + Químicos",       date: "20 de Jun, 2025", amount: "$380.00", status: "PENDENTE" },
  { id: "EST-2025-027", client: "Carlos Mendes",  svc: "Inspeção + Reparo",                 date: "18 de Jun, 2025", amount: "$310.00", status: "EXPIRADA" },
];

const services = [
  { icon: Wrench,        name: "Limpeza da Piscina",   desc: "Aspiração, escovação das paredes e linha d'água", qty: 1, unit: "$100.00", total: "$100.00" },
  { icon: Wrench,        name: "Reparo de Equipamento", desc: "Reparo da bomba da piscina",                      qty: 1, unit: "$250.00", total: "$250.00" },
  { icon: Grid3x3,       name: "Limpeza de Azulejo",   desc: "Limpeza da linha de azulejos e bordas",            qty: 1, unit: "$120.00", total: "$120.00" },
  { icon: Trash2,        name: "Troca do Filtro",      desc: "Substituição do cartucho do filtro",               qty: 1, unit: "$200.00", total: "$200.00" },
  { icon: FlaskConical,  name: "Balanceamento Químico", desc: "Ajuste e balanceamento dos produtos químicos",    qty: 1, unit: "$80.00",  total: "$80.00" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-700",
    APROVADA: "bg-green-100 text-green-700",
    ENVIADA: "bg-sky-100 text-sky-700",
    EXPIRADA: "bg-slate-200 text-slate-600",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${map[s] ?? "bg-gray-100"}`}>{s}</span>;
}

function EstimativaPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="grid grid-cols-12 gap-5 p-5">
        {/* LEFT */}
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Estimativas</h1>
            <button className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow">
              <Plus className="h-4 w-4" /> Nova Estimativa
            </button>
          </div>
          <div className="flex gap-4 border-b text-sm">
            {tabs.map((t, i) => (
              <button key={t} className={`pb-2 ${i === 0 ? "border-b-2 border-[var(--brand-blue)] text-[var(--brand-blue)] font-semibold" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input placeholder="Buscar estimativas..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-[var(--brand-blue)]"><Filter className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            {estimates.map((e) => (
              <div key={e.id} className={`rounded-lg border p-4 ${e.active ? "border-[var(--brand-blue)]/40 bg-sky-50/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div className="font-bold text-[var(--brand-blue)]">{e.id}</div>
                  {statusBadge(e.status)}
                </div>
                <div className="mt-1 text-sm text-slate-700">{e.client}</div>
                <div className="text-xs text-slate-500">{e.svc}</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-xs text-slate-500">{e.date}</div>
                  <div className="font-bold text-slate-900">{e.amount}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700">
            <FileText className="h-4 w-4" /> Ver todas as estimativas
          </button>
        </aside>

        {/* CENTER */}
        <section className="col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-900">Estimativa #EST-2025-031</h2>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">PENDENTE</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-[var(--brand-blue)]" /> Enviar
              </button>
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                <Download className="h-4 w-4 text-[var(--brand-blue)]" /> PDF
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <DocCardHeader title="ESTIMATIVA" number="EST-2025-031" />
            <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1 text-slate-700">
                <div>123 Blue Water Way</div>
                <div>Orlando, FL 32801</div>
                <div>(407) 555-1234</div>
                <div>hello@aquaclearpools.com</div>
              </div>
              <div className="space-y-1 text-right text-slate-700">
                <div><span className="font-semibold text-slate-900">Data da Estimativa:</span> 26 de Jun, 2025</div>
                <div><span className="font-semibold text-slate-900">Válida até:</span> 10 de Jul, 2025</div>
              </div>
            </div>

            <hr className="my-6 border-slate-100" />

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900"><User className="h-4 w-4" /> Cliente</div>
                <div className="mt-2 space-y-0.5 text-slate-700">
                  <div>John Smith</div>
                  <div>(407) 555-1234</div>
                  <div>john.smith@email.com</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900"><MapPin className="h-4 w-4" /> Endereço do Serviço</div>
                <div className="mt-2 space-y-0.5 text-slate-700">
                  <div>123 Lakeview Dr</div>
                  <div>Orlando, FL 32801</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 font-bold text-slate-900">Serviços Solicitados</div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--brand-blue)] text-white">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">SERVIÇO</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">DESCRIÇÃO</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">QTD</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">VALOR UNIT.</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.name} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <s.icon className="h-4 w-4 text-[var(--brand-blue)]" /> {s.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{s.desc}</td>
                        <td className="px-4 py-3 text-slate-700">{s.qty}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{s.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="font-bold text-slate-900">Observações</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Os valores podem sofrer alteração após inspeção técnica.</li>
                  <li>Recomendado manter a piscina limpa regularmente para melhor durabilidade dos equipamentos.</li>
                </ul>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>$750.00</span></div>
                <div className="flex justify-between text-slate-700"><span>Desconto</span><span className="text-green-600">-$25.00</span></div>
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-extrabold text-[var(--brand-blue)]">$725.00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="col-span-3 space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Resumo da Estimativa</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={poolImg} alt="Piscina" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
            <div className="space-y-3 p-4 text-sm">
              {[
                { icon: ListChecks, label: "Serviços", value: "5 itens" },
                { icon: CalendarDays, label: "Válida até", value: "10 de Jul, 2025" },
                { icon: Clock, label: "Tempo estimado", value: "3 a 4 horas" },
                { icon: ShieldCheck, label: "Garantia do serviço", value: "30 dias" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <r.icon className="h-4 w-4 text-[var(--brand-blue)]" /> {r.label}
                  </div>
                  <span className="font-semibold text-slate-900">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="font-bold text-[var(--brand-blue)]">Próximos Passos</div>
            <p className="mt-1 text-sm text-slate-700">Após sua aprovação, nossa equipe entrará em contato para agendar o melhor dia e horário para o serviço.</p>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600">
              <CheckCircle2 className="h-4 w-4" /> Aprovar Estimativa
            </button>
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700">
              <Pencil className="h-4 w-4" /> Solicitar Alterações
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="font-bold text-slate-900">Dúvidas?</div>
            <p className="text-sm text-slate-600">Estamos aqui para ajudar!</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700"><Phone className="h-4 w-4 text-[var(--brand-blue)]" /> (407) 555-1234</div>
              <div className="flex items-center gap-2 text-slate-700"><Mail className="h-4 w-4 text-[var(--brand-blue)]" /> hello@aquaclearpools.com</div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
