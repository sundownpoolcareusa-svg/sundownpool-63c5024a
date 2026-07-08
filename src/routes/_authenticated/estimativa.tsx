import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Modal } from "@/components/Modal";
import { DocCardHeader } from "@/components/InvoiceCard";
import {
  Plus, Search, Filter, FileText, Download, MoreHorizontal, User, MapPin,
  Wrench, ListChecks, CalendarDays, Clock, ShieldCheck, Phone, CheckCircle2, Trash2, Pencil,
} from "lucide-react";
import poolImg from "@/assets/pool.jpg";
import { listEstimates, listClients, nextNumber, fmt, fmtDate, type Estimate } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";
import { formatPhone, downloadElementAsPdf } from "@/lib/pdf";
import { useShareLink } from "@/components/ShareLink";
import { Link2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estimativa")({
  component: EstimativaPage,
});

const tabs = ["All", "Pending", "Sent", "Approved", "Expired"];
const tabStatus: Record<string, string | null> = {
  All: null, Pending: "PENDENTE", Sent: "ENVIADA", Approved: "APROVADA", Expired: "EXPIRADA",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-700",
    APROVADA: "bg-green-100 text-green-700",
    ENVIADA: "bg-sky-100 text-sky-700",
    EXPIRADA: "bg-slate-200 text-slate-600",
  };
  const labels: Record<string, string> = { PENDENTE: "PENDING", APROVADA: "APPROVED", ENVIADA: "SENT", EXPIRADA: "EXPIRED" };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${map[s] ?? "bg-gray-100"}`}>{labels[s] ?? s}</span>;
}

function EstimativaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [tab, setTab] = useState("Todas");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates });

  const filtered = estimates.filter((e) => {
    const want = tabStatus[tab];
    if (want && e.status !== want) return false;
    if (search && !e.number.toLowerCase().includes(search.toLowerCase()) && !e.client?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const selected = estimates.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estimates").update({ status: "APROVADA" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Estimate approved!"); qc.invalidateQueries({ queryKey: ["estimates"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("estimate_items").delete().eq("estimate_id", id);
      const { error } = await supabase.from("estimates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estimate deleted");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12">
        {/* LEFT */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Estimates</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow">
              <Plus className="h-4 w-4" /> New Estimate
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto border-b text-sm">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-[var(--brand-blue)] text-[var(--brand-blue)] font-semibold" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estimativas..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-[var(--brand-blue)]"><Filter className="h-4 w-4" /></button>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No estimates</p>
              <p className="text-xs text-slate-400">Clique em "New Estimate".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => (
                <button key={e.id} onClick={() => setSelectedId(e.id)} className={`block w-full rounded-lg border p-4 text-left ${selected?.id === e.id ? "border-[var(--brand-blue)]/40 bg-sky-50/60" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[var(--brand-blue)]">{e.number}</div>
                    {statusBadge(e.status)}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{e.client?.name}</div>
                  <div className="text-xs text-slate-500">{e.title || "—"}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-xs text-slate-500">{fmtDate(e.estimate_date)}</div>
                    <div className="font-bold text-slate-900">{fmt(e.total)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CENTER */}
        <section className="space-y-4 lg:col-span-6">
          {selected ? (
            <EstimateDetail estimate={selected} />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-semibold text-slate-700">No estimates</p>
              <p className="mt-1 text-sm text-slate-500">Create your first estimate.</p>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 lg:col-span-3">
          {selected && (
            <>
              <h3 className="text-lg font-extrabold text-slate-900">Estimate Summary</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img src={poolImg} alt="Piscina" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
                <div className="space-y-3 p-4 text-sm">
                  <Row icon={ListChecks} label="Services" value={`${(selected.estimate_items ?? []).length} items`} />
                  <Row icon={CalendarDays} label="Valid until" value={fmtDate(selected.valid_until)} />
                  <Row icon={Clock} label="Estimated time" value="To be agreed" />
                  <Row icon={ShieldCheck} label="Warranty" value="30 days" />
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div className="font-bold text-[var(--brand-blue)]">Next Steps</div>
                <p className="mt-1 text-sm text-slate-700">Approve the estimate to generate the invoice.</p>
                <button disabled={selected.status === "APROVADA" || approve.isPending} onClick={() => approve.mutate(selected.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> {selected.status === "APROVADA" ? "Approved" : "Approve Estimate"}
                </button>
                {selected.status === "APROVADA" && (
                  <Link to="/invoice" className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white py-2.5 text-sm font-semibold text-[var(--brand-blue)]">
                    Generate Invoice →
                  </Link>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="font-bold text-slate-900">Questions?</div>
                <p className="text-sm text-slate-600">We are here to help!</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-700"><Phone className="h-4 w-4 text-[var(--brand-blue)]" /> (561) 376-2428</div>
                </div>
              </div>
            </>
          )}
        </aside>
      </main>

      <NewEstimateModal open={open} onClose={() => setOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["estimates"] })} />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-700"><Icon className="h-4 w-4 text-[var(--brand-blue)]" /> {label}</div>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function EstimateDetail({ estimate }: { estimate: Estimate }) {
  const items = (estimate.estimate_items ?? []).slice().sort((a, b) => a.position - b.position);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { share, modal: shareModal } = useShareLink();
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${estimate.public_token}`;
  return (
    <>
      {shareModal}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Estimate #{estimate.number}</h2>
          {statusBadge(estimate.status)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => share(publicUrl, `Estimate ${estimate.number}`)}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
          >
            <Link2 className="h-4 w-4 text-[var(--brand-blue)]" /> Send
          </button>
          <button
            onClick={() => {
              if (!pdfRef.current) return;
              const fname = `${estimate.client?.name || "Client"} ${estimate.number}`;
              downloadElementAsPdf(pdfRef.current, fname);
            }}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
          >
            <Download className="h-4 w-4 text-[var(--brand-blue)]" /> PDF
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={pdfRef} className="pdf-print rounded-xl border border-slate-200 bg-white pt-1 pb-5 px-5 shadow-sm">
        <DocCardHeader title="ESTIMATE" number={estimate.number} />
        <div className="mt-1 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div className="space-y-1 text-slate-700">
            <div>4008 Destination Dr</div>
            <div>Osprey, FL 34229</div>
            <div>(561) 376-2428</div>
          </div>
          <div className="space-y-1 text-slate-700 sm:text-right">
            <div><span className="font-semibold text-slate-900">Date:</span> {fmtDate(estimate.estimate_date)}</div>
            <div><span className="font-semibold text-slate-900">Valid until:</span> {fmtDate(estimate.valid_until)}</div>
          </div>
        </div>

        <hr className="my-4 border-slate-100" />
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900"><User className="h-4 w-4" /> Client</div>
            <div className="mt-2 space-y-0.5 text-slate-700">
              <div>{estimate.client?.name}</div>
              {estimate.client?.phone && <div>{formatPhone(estimate.client.phone)}</div>}
              {estimate.client?.email && <div>{estimate.client.email}</div>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900"><MapPin className="h-4 w-4" /> Service Address</div>
            <div className="mt-2 space-y-0.5 text-slate-700">
              <div>{estimate.client?.address || "—"}</div>
              <div>{estimate.client?.city || ""}</div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 font-bold text-slate-900">Requested Services</div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[var(--doc-blue)] text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">SERVICE</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">DESCRIPTION</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">QTD</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">UNIT PRICE</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-bold text-slate-900"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[var(--doc-blue)]" /> {s.name}</div></td>
                    <td className="px-4 py-3 text-slate-700">{s.description}</td>
                    <td className="px-4 py-3 text-slate-700">{s.qty}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(Number(s.unit_price))}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(Number(s.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="font-bold text-slate-900">Notes</div>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{estimate.notes || "—"}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(estimate.subtotal)}</span></div>
            <div className="flex justify-between text-slate-700"><span>Discount</span><span className="text-green-600">-{fmt(estimate.discount)}</span></div>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="text-base font-bold text-slate-900">Total</span>
              <span className="text-2xl font-extrabold text-[var(--brand-blue)]">{fmt(estimate.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type ItemRow = { name: string; description: string; qty: number; unit_price: number };

function NewEstimateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates, enabled: open });

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Limpeza e Manutenção da Piscina");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Prices may change after on-site inspection.");
  const [items, setItems] = useState<ItemRow[]>([
    { name: "Limpeza da Piscina", description: "Aspiração e escovação", qty: 1, unit_price: 100 },
  ]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.unit_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);

  const mut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client");
      if (items.length === 0) throw new Error("Add at least one item");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const number = nextNumber("EST", estimates.map((e) => e.number));
      const { data: est, error } = await supabase.from("estimates").insert({
        user_id: u.user.id, client_id: clientId, number, title,
        valid_until: validUntil || null, status: "PENDENTE",
        subtotal, discount, total, notes,
      }).select().single();
      if (error) throw error;
      const rows = items.map((it, idx) => ({
        estimate_id: est.id, name: it.name, description: it.description,
        qty: it.qty, unit_price: it.unit_price, total: it.qty * it.unit_price, position: idx,
      }));
      const { error: e2 } = await supabase.from("estimate_items").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Estimate created!");
      setClientId(""); setItems([{ name: "Limpeza da Piscina", description: "Aspiração e escovação", qty: 1, unit_price: 100 }]);
      setDiscount(0);
      onCreated(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Estimate" maxWidth="max-w-3xl" closeOnOverlayClick={false}>
      {clients.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-600">Você precisa criar um cliente primeiro.</p>
          <Link to="/clientes" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-[var(--brand-blue)] hover:underline">Go to Clients →</Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Valid until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Services</label>
              <button type="button" onClick={() => setItems([...items, { name: "", description: "", qty: 1, unit_price: 0 }])} className="text-sm font-semibold text-[var(--brand-blue)]">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="col-span-3 rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Service" value={it.name} onChange={(e) => { const n = [...items]; n[idx].name = e.target.value; setItems(n); }} />
                  <input className="col-span-5 rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <input className="col-span-1 rounded-md border border-slate-200 px-2 py-2 text-sm" type="number" step="0.01" placeholder="Qty" value={it.qty} onChange={(e) => { const n = [...items]; n[idx].qty = Number(e.target.value); setItems(n); }} />
                  <input className="col-span-2 rounded-md border border-slate-200 px-3 py-2 text-sm" type="number" step="0.01" placeholder="Price" value={it.unit_price} onChange={(e) => { const n = [...items]; n[idx].unit_price = Number(e.target.value); setItems(n); }} />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 grid place-items-center rounded-md border border-slate-200 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex items-center justify-between text-slate-700"><span>Discount</span><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm" /></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="text-[var(--brand-blue)]">{fmt(total)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={mut.isPending} className="rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {mut.isPending ? "Saving..." : "Create Estimate"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
