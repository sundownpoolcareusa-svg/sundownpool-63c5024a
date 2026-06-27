import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Modal } from "@/components/Modal";
import {
  Plus, Search, Filter, Calendar, Eye, MoreVertical, Smartphone, Share2, Upload, ChevronDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { listClients, fmtDate, initials, type Client } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

const avatarColors = [
  "bg-sky-200 text-sky-800", "bg-orange-200 text-orange-800", "bg-purple-200 text-purple-800",
  "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800", "bg-green-200 text-green-800",
  "bg-cyan-200 text-cyan-800", "bg-amber-200 text-amber-800",
];

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: listClients });

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const total = clients.length;
  const ativos = clients.filter((c) => c.status === "Ativo").length;
  const now = new Date();
  const novos = clients.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="grid grid-cols-12 gap-5 p-5">
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
              <Plus className="h-4 w-4" /> Novo Cliente
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="border-b pb-2 font-bold text-slate-900">Resumo</div>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Total de Clientes</span><span className="font-bold text-slate-900">{total}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Clientes Ativos</span><span className="font-bold text-green-600">{ativos}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Novos este mês</span><span className="font-bold text-[var(--brand-blue)]">{novos}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Serviços este mês</span><span className="font-bold text-amber-600">0</span></div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="font-bold text-slate-900">Próximos Serviços</div>
            <p className="mt-3 text-sm text-slate-500">Nenhum serviço agendado.</p>
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

        <section className="col-span-9 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-900">Lista de Clientes</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">Todos os status <ChevronDown className="h-4 w-4" /></button>
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><Filter className="h-4 w-4 text-[var(--brand-blue)]" /> Filtrar</button>
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><Upload className="h-4 w-4 text-[var(--brand-blue)]" /> Exportar</button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Nenhum cliente cadastrado</p>
              <p className="text-sm text-slate-500">Clique em "Novo Cliente" para começar.</p>
              <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Adicionar primeiro cliente
              </button>
            </div>
          ) : (
            <>
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 font-medium">Cliente</th>
                    <th className="py-3 font-medium">Contato</th>
                    <th className="py-3 font-medium">Endereço</th>
                    <th className="py-3 font-medium">Cadastrado</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${avatarColors[idx % avatarColors.length]}`}>
                            {initials(c.name)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-xs text-slate-500">{c.client_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-slate-900">{c.phone || "—"}</div>
                        <div className="text-xs text-[var(--brand-blue)]">{c.email || "—"}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-slate-900">{c.address || "—"}</div>
                        <div className="text-xs text-slate-500">{c.city || ""}</div>
                      </td>
                      <td className="py-4 text-slate-700">{fmtDate(c.created_at)}</td>
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
                <div className="text-slate-500">Mostrando {filtered.length} de {total} clientes</div>
                <div className="flex items-center gap-1">
                  <button className="grid h-8 w-8 place-items-center rounded border border-slate-200"><ChevronLeft className="h-4 w-4" /></button>
                  <button className="grid h-8 min-w-8 place-items-center rounded border border-[var(--brand-blue)] bg-[var(--brand-blue)] px-2 text-white">1</button>
                  <button className="grid h-8 w-8 place-items-center rounded border border-slate-200"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <NewClientModal open={open} onClose={() => setOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["clients"] })} />
    </div>
  );
}

const WEEKDAYS = [
  { v: "Seg", label: "Segunda" },
  { v: "Ter", label: "Terça" },
  { v: "Qua", label: "Quarta" },
  { v: "Qui", label: "Quinta" },
  { v: "Sex", label: "Sexta" },
  { v: "Sáb", label: "Sábado" },
  { v: "Dom", label: "Domingo" },
];

function NewClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", client_type: "Residencial", service_days: [] as string[] });

  const toggleDay = (d: string) =>
    setForm((f) => ({ ...f, service_days: f.service_days.includes(d) ? f.service_days.filter((x) => x !== d) : [...f.service_days, d] }));

  const mut = useMutation({
    mutationFn: async (values: typeof form) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { error } = await supabase.from("clients").insert({ ...values, user_id: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente criado!");
      setForm({ name: "", email: "", phone: "", address: "", city: "", client_type: "Residencial", service_days: [] });
      onCreated();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Novo Cliente">
      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        className="space-y-4"
      >
        <Field label="Nome *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onSelectPlace={(p) => setForm((f) => ({ ...f, address: p.address, city: p.city || f.city }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cidade/Estado" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <div>
            <label className="text-sm font-semibold text-slate-700">Tipo</label>
            <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option>Residencial</option><option>Comercial</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Dias de Serviço Recorrente</label>
          <p className="text-xs text-slate-500">Selecione um ou mais dias da semana</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const active = form.service_days.includes(d.v);
              return (
                <button
                  type="button"
                  key={d.v}
                  onClick={() => toggleDay(d.v)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button disabled={mut.isPending} className="rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Salvando..." : "Salvar Cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
    </div>
  );
}

// Re-export icon import that's referenced
import { Users } from "lucide-react";
