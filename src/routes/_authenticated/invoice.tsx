import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Modal } from "@/components/Modal";
import { DocCardHeader } from "@/components/InvoiceCard";
import {
  Plus, Search, Filter, FileText, Download, MoreHorizontal,
  Droplet, Wrench, ShoppingBasket, FlaskConical, Calendar, Trash2,
} from "lucide-react";
import poolImg from "@/assets/pool.jpg";
import { listInvoices, listClients, listEstimates, nextNumber, fmt, fmtDate, type Invoice } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoice")({
  component: InvoicePage,
});

const tabs = ["All", "Paid", "Sent", "Overdue", "Draft"];

const footerCats = [
  { icon: Droplet, title: "Pool Cleaning", text: "Regular cleaning and maintenance" },
  { icon: Wrench, title: "Repairs", text: "Equipment and system repairs" },
  { icon: ShoppingBasket, title: "Equipment", text: "Filters, pumps and equipment" },
  { icon: FlaskConical, title: "Chemicals", text: "Water balance and chemical treatment" },
  { icon: Calendar, title: "Scheduled Service", text: "Weekly, bi-weekly or monthly service" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    SENT: "bg-sky-100 text-sky-700",
    OVERDUE: "bg-orange-100 text-orange-700",
    DRAFT: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

function InvoicePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates });

  const filtered = invoices.filter((inv) => {
    if (tab !== "All" && inv.status.toLowerCase() !== tab.toLowerCase()) return false;
    if (search && !inv.number.toLowerCase().includes(search.toLowerCase()) && !inv.client?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selected = invoices.find((i) => i.id === selectedId) ?? filtered[0] ?? null;
  const pendingEstimate = estimates.find((e) => e.status === "PENDENTE" || e.status === "ENVIADA");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="grid grid-cols-12 gap-5 p-5">
        {/* LEFT */}
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Invoices</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </div>
          <div className="flex gap-4 border-b text-sm">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-[var(--brand-blue)] text-[var(--brand-blue)] font-semibold" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-[var(--brand-blue)]"><Filter className="h-4 w-4" /></button>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No invoices yet</p>
              <p className="text-xs text-slate-400">Create an estimate first, or click New Invoice.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inv) => (
                <button key={inv.id} onClick={() => setSelectedId(inv.id)} className={`block w-full rounded-lg border p-4 text-left ${selected?.id === inv.id ? "border-[var(--brand-blue)]/40 bg-sky-50/60" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[var(--brand-blue)]">{inv.number}</div>
                    <div className={`font-bold ${inv.status === "PAID" ? "text-green-600" : "text-slate-900"}`}>{fmt(inv.total)}</div>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <div>
                      <div className="text-sm text-slate-700">{inv.client?.name}</div>
                      <div className="text-xs text-slate-500">{fmtDate(inv.invoice_date)}</div>
                    </div>
                    {statusBadge(inv.status)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CENTER */}
        <section className="col-span-6 space-y-4">
          {selected ? (
            <InvoiceDetail invoice={selected} />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-semibold text-slate-700">No invoice selected</p>
              <p className="mt-1 text-sm text-slate-500">Click "New Invoice" to create your first invoice.</p>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="col-span-3 space-y-4">
          {pendingEstimate ? (
            <>
              <h3 className="text-lg font-extrabold text-slate-900">Estimate #{pendingEstimate.number}</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img src={poolImg} alt="Pool" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
                <div className="p-4">
                  <div className="font-bold text-slate-900">{pendingEstimate.title || "Estimate"}</div>
                  <p className="mt-1 text-sm text-slate-600">Client: {pendingEstimate.client?.name}</p>
                  <hr className="my-4 border-slate-100" />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(pendingEstimate.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-700"><span>Discount</span><span className="text-green-600">-{fmt(pendingEstimate.discount)}</span></div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="text-xl font-extrabold text-[var(--brand-blue)]">{fmt(pendingEstimate.total)}</span>
                    </div>
                  </div>
                  <Link to="/estimativa" className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white">
                    View Estimate
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No pending estimate</p>
              <Link to="/estimativa" className="mt-3 inline-block text-sm font-semibold text-[var(--brand-blue)] hover:underline">Create estimate →</Link>
            </div>
          )}
        </aside>
      </main>

      <section className="mx-5 mb-6 rounded-xl border border-slate-200 bg-white px-6 py-6">
        <div className="grid grid-cols-5 gap-6">
          {footerCats.map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <c.icon className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-blue)]" />
              <div>
                <div className="font-bold text-slate-900">{c.title}</div>
                <div className="text-sm text-slate-600">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NewInvoiceModal open={open} onClose={() => setOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["invoices"] })} />
    </div>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const items = (invoice.invoice_items ?? []).slice().sort((a, b) => a.position - b.position);
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold text-slate-900">Invoice</h2>
          {statusBadge(invoice.status)}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
            <Download className="h-4 w-4 text-[var(--brand-blue)]" /> Download PDF
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <DocCardHeader title="INVOICE" number={invoice.number} />
        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-1 text-slate-700">
            <div>4008 Destination Dr #2208</div>
            <div>Osprey, FL 34229</div>
            <div>(407) 555-1234</div>
            <div>hello@sundownpoolservice.com</div>
          </div>
          <div className="space-y-1 text-right text-slate-700">
            <div><span className="font-semibold text-slate-900">Date:</span> {fmtDate(invoice.invoice_date)}</div>
            <div><span className="font-semibold text-slate-900">Due Date:</span> {fmtDate(invoice.due_date)}</div>
          </div>
        </div>
        <hr className="my-6 border-slate-100" />
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-bold text-slate-900">Bill To:</div>
            <div className="mt-1 space-y-0.5 text-slate-700">
              <div>{invoice.client?.name}</div>
              {invoice.client?.address && <div>{invoice.client.address}</div>}
              {invoice.client?.city && <div>{invoice.client.city}</div>}
              {invoice.client?.phone && <div>{invoice.client.phone}</div>}
              {invoice.client?.email && <div>{invoice.client.email}</div>}
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-900">Service Address:</div>
            <div className="mt-1 space-y-0.5 text-slate-700">
              <div>{invoice.client?.address || "—"}</div>
              <div>{invoice.client?.city || ""}</div>
            </div>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-[var(--brand-blue)] text-white">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">DESCRIPTION</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">QTY</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">RATE</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 text-slate-700">{it.description}</td>
                  <td className="px-4 py-2.5 text-slate-700">{it.qty}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{fmt(it.rate)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between text-slate-700"><span>Tax</span><span>{fmt(invoice.tax)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className={`font-extrabold ${invoice.status === "PAID" ? "text-green-600" : "text-slate-900"}`}>{fmt(invoice.total)}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

type LineRow = { description: string; qty: number; rate: number };

function NewInvoiceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates, enabled: open });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices, enabled: open });

  const [clientId, setClientId] = useState("");
  const [estimateId, setEstimateId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("SENT");
  const [items, setItems] = useState<LineRow[]>([{ description: "Pool Cleaning – Standard", qty: 1, rate: 100 }]);
  const [tax, setTax] = useState(0);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.rate, 0), [items]);
  const total = subtotal + tax;

  // Apply estimate if selected
  function applyEstimate(id: string) {
    setEstimateId(id);
    if (!id) return;
    const e = estimates.find((x) => x.id === id);
    if (e) {
      setClientId(e.client_id);
      setItems((e.estimate_items ?? []).map((it) => ({ description: it.name, qty: Number(it.qty), rate: Number(it.unit_price) })));
    }
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client");
      if (items.length === 0) throw new Error("Add at least one item");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const number = nextNumber("INV", invoices.map((i) => i.number));
      const { data: inv, error } = await supabase.from("invoices").insert({
        user_id: u.user.id, client_id: clientId, estimate_id: estimateId || null,
        number, due_date: dueDate || null, status, subtotal, tax, total,
      }).select().single();
      if (error) throw error;
      const rows = items.map((it, idx) => ({
        invoice_id: inv.id, description: it.description, qty: it.qty, rate: it.rate,
        amount: it.qty * it.rate, position: idx,
      }));
      const { error: e2 } = await supabase.from("invoice_items").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Invoice created!");
      setClientId(""); setEstimateId(""); setDueDate(""); setStatus("SENT"); setTax(0);
      setItems([{ description: "Pool Cleaning – Standard", qty: 1, rate: 100 }]);
      onCreated(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Invoice" maxWidth="max-w-3xl">
      {clients.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-600">You need to create a client first.</p>
          <Link to="/clientes" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-[var(--brand-blue)] hover:underline">Go to Clients →</Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          {estimates.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Create from Estimate (optional)</label>
              <select value={estimateId} onChange={(e) => applyEstimate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">— None —</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.number} — {e.client?.name} ({fmt(e.total)})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>DRAFT</option><option>SENT</option><option>PAID</option><option>OVERDUE</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Items</label>
              <button type="button" onClick={() => setItems([...items, { description: "", qty: 1, rate: 0 }])} className="text-sm font-semibold text-[var(--brand-blue)]">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="col-span-7 rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <input className="col-span-2 rounded-md border border-slate-200 px-3 py-2 text-sm" type="number" step="0.01" placeholder="Qty" value={it.qty} onChange={(e) => { const n = [...items]; n[idx].qty = Number(e.target.value); setItems(n); }} />
                  <input className="col-span-2 rounded-md border border-slate-200 px-3 py-2 text-sm" type="number" step="0.01" placeholder="Rate" value={it.rate} onChange={(e) => { const n = [...items]; n[idx].rate = Number(e.target.value); setItems(n); }} />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 grid place-items-center rounded-md border border-slate-200 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex items-center justify-between text-slate-700"><span>Tax</span><input type="number" step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm" /></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="text-[var(--brand-blue)]">{fmt(total)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={mut.isPending} className="rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {mut.isPending ? "Saving..." : "Create Invoice"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
