import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import { DocCardHeader } from "@/components/InvoiceCard";
import {
  Plus, Search, Filter, FileText, Download, MoreHorizontal, Link2, Check, X,
  Droplet, Wrench, ShoppingBasket, FlaskConical, Calendar, Trash2, Pencil, Save,
} from "lucide-react";
import poolImg from "@/assets/pool.jpg";
import { listInvoices, listClients, listEstimates, nextNumber, fmt, fmtDate, formatPhone, createService, sendInvoiceReceipt, errorMessage, type Invoice } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";
import { downloadElementAsPdf } from "@/lib/pdf";
import { useShareLink } from "@/components/ShareLink";
import { ServicePicker } from "@/components/ServicePicker";
import { ServiceCatalogModal } from "@/components/ServiceCatalogModal";

export const Route = createFileRoute("/_authenticated/invoice")({
  component: InvoicePage,
});

const tabs = ["All", "Paid", "Unpaid"];

const footerCats = [
  { icon: Droplet, title: "Pool Cleaning", text: "Regular cleaning and maintenance" },
  { icon: Wrench, title: "Repairs", text: "Equipment and system repairs" },
  { icon: ShoppingBasket, title: "Equipment", text: "Filters, pumps and equipment" },
  { icon: FlaskConical, title: "Chemicals", text: "Water balance and chemical treatment" },
  { icon: Calendar, title: "Scheduled Service", text: "Weekly, bi-weekly or monthly service" },
];

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const PAYMENT_METHODS = ["Stripe", "Zelle", "Cash", "Cheque"];

function statusBadge(s: string, paymentMethod?: string | null) {
  const isPaid = s === "PAID";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: isPaid ? "var(--dash-badge-paid-bg)" : "var(--dash-badge-unpaid-bg)",
        color: isPaid ? "var(--dash-badge-paid-text)" : "var(--dash-badge-unpaid-text)",
      }}
    >
      {isPaid ? "Paid" : "Unpaid"}{isPaid && paymentMethod ? ` · ${paymentMethod}` : ""}
    </span>
  );
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
    if (tab === "Paid" && inv.status !== "PAID") return false;
    if (tab === "Unpaid" && inv.status === "PAID") return false;
    if (search && !inv.number.toLowerCase().includes(search.toLowerCase()) && !inv.client?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selected = invoices.find((i) => i.id === selectedId) ?? filtered[0] ?? null;
  const pendingEstimate = estimates.find((e) => e.status === "PENDENTE" || e.status === "ENVIADA");

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-20 lg:pb-0 lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12 print:block print:p-0">
        {/* LEFT */}
        <aside className="space-y-4 lg:col-span-3 print:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-extrabold text-[var(--dash-text)]">Invoices</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto border-b border-[var(--dash-border)] text-sm">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="pb-2 font-semibold"
                style={{
                  borderBottom: tab === t ? "2px solid var(--dash-navy)" : "2px solid transparent",
                  color: tab === t ? "var(--dash-navy)" : "var(--dash-text-muted)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-[11px] border border-[var(--dash-border-input)] bg-white text-[var(--dash-navy)]"><Filter className="h-4 w-4" /></button>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
              <p className="mt-2 text-sm text-[var(--dash-text-muted-2)]">No invoices yet</p>
              <p className="text-xs text-[var(--dash-text-muted)]">Create an estimate first, or click New Invoice.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className="block w-full rounded-[18px] border p-4 text-left"
                  style={{
                    borderColor: selected?.id === inv.id ? "var(--dash-navy)" : "var(--dash-border)",
                    background: selected?.id === inv.id ? "var(--dash-water-bg)" : "#fff",
                    ...cardShadow,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[var(--dash-navy)]">{inv.number}</div>
                    <div className="font-bold tabular-nums" style={{ color: inv.status === "PAID" ? "var(--dash-green)" : "var(--dash-text)" }}>{fmt(inv.total)}</div>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <div>
                      <div className="text-sm text-[var(--dash-text-secondary)]">{inv.client?.name}</div>
                      <div className="text-xs text-[var(--dash-text-muted)]">{fmtDate(inv.invoice_date)}</div>
                    </div>
                    {statusBadge(inv.status, inv.payment_method)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CENTER */}
        <section className="space-y-4 lg:col-span-6 print:col-span-12">
          {selected ? (
            <InvoiceDetail invoice={selected} onChanged={() => qc.invalidateQueries({ queryKey: ["invoices"] })} />
          ) : (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white p-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-[var(--dash-text-muted)]" />
              <p className="mt-4 text-lg font-semibold text-[var(--dash-text-secondary)]">No invoice selected</p>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">Click "New Invoice" to create your first invoice.</p>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 lg:col-span-3 print:hidden">
          {pendingEstimate ? (
            <>
              <h3 className="text-lg font-extrabold text-[var(--dash-text)]">Estimate #{pendingEstimate.number}</h3>
              <div className="overflow-hidden rounded-[18px] border border-[var(--dash-border)] bg-white" style={cardShadow}>
                <img src={poolImg} alt="Pool" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
                <div className="p-[18px]">
                  <div className="font-bold text-[var(--dash-text)]">{pendingEstimate.title || "Estimate"}</div>
                  <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">Client: {pendingEstimate.client?.name}</p>
                  <hr className="my-4 border-[var(--dash-border)]" />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(pendingEstimate.subtotal)}</span></div>
                    <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Discount</span><span className="tabular-nums" style={{ color: "var(--dash-green)" }}>-{fmt(pendingEstimate.discount)}</span></div>
                    <div className="mt-2 flex items-center justify-between border-t border-[var(--dash-border)] pt-2">
                      <span className="font-bold text-[var(--dash-text)]">Total</span>
                      <span className="text-xl font-extrabold tabular-nums" style={{ color: "var(--dash-navy)" }}>{fmt(pendingEstimate.total)}</span>
                    </div>
                  </div>
                  <Link to="/estimativa" className="mt-4 flex w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--dash-navy)] py-2.5 text-sm font-semibold text-white">
                    View Estimate
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white p-6 text-center">
              <p className="text-sm font-semibold text-[var(--dash-text-secondary)]">No pending estimate</p>
              <Link to="/estimativa" className="mt-3 inline-block text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)] hover:underline">Create estimate →</Link>
            </div>
          )}
        </aside>
      </main>

      <section className="mx-3 mb-6 rounded-[18px] border border-[var(--dash-border)] bg-white px-4 py-5 sm:mx-5 sm:px-6 sm:py-6 print:hidden" style={cardShadow}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {footerCats.map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[8px]" style={{ background: "var(--dash-water-bg)" }}>
                <c.icon className="h-[18px] w-[18px]" style={{ color: "var(--dash-water-icon)" }} />
              </span>
              <div>
                <div className="font-bold text-[var(--dash-text)]">{c.title}</div>
                <div className="text-sm text-[var(--dash-text-secondary)]">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NewInvoiceModal open={open} onClose={() => setOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["invoices"] })} />
    </div>
  );
}

function InvoiceDetail({ invoice, onChanged }: { invoice: Invoice; onChanged: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  // "method" — pick Stripe/Zelle/Cash/Cheque; "send-receipt" — follow-up
  // asking whether to email the client a paid receipt right away.
  const [paymentStep, setPaymentStep] = useState<"method" | "send-receipt" | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const items = (invoice.invoice_items ?? []).slice().sort((a, b) => a.position - b.position);
  const isPaid = invoice.status === "PAID";

  const markPaid = useMutation({
    mutationFn: async (method: string) => {
      const { error } = await supabase.from("invoices").update({ status: "PAID", payment_method: method }).eq("id", invoice.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked as paid"); onChanged(); setPaymentStep("send-receipt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendReceipt = useMutation({
    mutationFn: () => sendInvoiceReceipt(invoice.id),
    onSuccess: () => { toast.success("Receipt emailed to client!"); setPaymentStep(null); },
    onError: (e: Error) => { toast.error(errorMessage(e, "Could not send receipt")); setPaymentStep(null); },
  });

  const markUnpaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").update({ status: "UNPAID", payment_method: null }).eq("id", invoice.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked as unpaid"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/i/${invoice.public_token}`;
  const { share, modal: shareModal } = useShareLink();

  return (
    <>
      {shareModal}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-[var(--dash-text)] sm:text-2xl">Invoice</h2>
          {statusBadge(invoice.status, invoice.payment_method)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]"
          >
            <Pencil className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Edit
          </button>
          <button
            onClick={() => isPaid ? markUnpaid.mutate() : setPaymentStep("method")}
            disabled={markPaid.isPending || markUnpaid.isPending}
            className="flex items-center gap-2 rounded-[11px] px-3 py-2 text-sm font-semibold text-white"
            style={{ background: isPaid ? "var(--dash-orange)" : "var(--dash-green)" }}
          >
            {isPaid ? <><X className="h-4 w-4" /> Mark Unpaid</> : <><Check className="h-4 w-4" /> Mark Paid</>}
          </button>
          <button
            onClick={() => share(publicUrl, `Invoice ${invoice.number}`)}
            className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]"
          >
            <Link2 className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> <span className="hidden sm:inline">Client </span>Link
          </button>
          <button
            onClick={() => {
              if (!pdfRef.current) return;
              const fname = `${invoice.client?.name || "Client"} ${invoice.number}`;
              downloadElementAsPdf(pdfRef.current, fname);
            }}
            className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]"
          >
            <Download className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> PDF
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary)]"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </div>
      <EditInvoiceModal key={invoice.id} invoice={invoice} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { onChanged(); setEditOpen(false); }} />
      <Modal open={paymentStep === "method"} onClose={() => setPaymentStep(null)} title="Payment Method">
        <p className="mb-3 text-sm text-[var(--dash-text-secondary)]">How was this invoice paid?</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => markPaid.mutate(m)}
              disabled={markPaid.isPending}
              className="rounded-[11px] border border-[var(--dash-border)] bg-white py-3 text-sm font-semibold text-[var(--dash-text-secondary)] hover:border-[var(--dash-navy)] hover:text-[var(--dash-navy)] disabled:opacity-50"
            >
              {m}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={paymentStep === "send-receipt"} onClose={() => setPaymentStep(null)} title="Send Receipt?">
        {invoice.client?.email ? (
          <>
            <p className="mb-4 text-sm text-[var(--dash-text-secondary)]">Email {invoice.client.name} a receipt for this paid invoice now?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentStep(null)}
                disabled={sendReceipt.isPending}
                className="rounded-[11px] border border-[var(--dash-border)] bg-white py-2.5 text-sm font-semibold text-[var(--dash-text-secondary)] disabled:opacity-50"
              >
                Not now
              </button>
              <button
                onClick={() => sendReceipt.mutate()}
                disabled={sendReceipt.isPending}
                className="rounded-[11px] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--dash-navy)" }}
              >
                {sendReceipt.isPending ? "Sending..." : "Yes, send"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--dash-text-secondary)]">This client has no email on file, so there's no way to send them a receipt.</p>
        )}
      </Modal>
      <div ref={pdfRef} className="pdf-print rounded-[20px] border border-[var(--dash-border)] bg-white px-[26px] pb-[26px] pt-1 print:border-0 print:shadow-none" style={cardShadow}>
        <DocCardHeader title="INVOICE" number={invoice.number} />
        <div className="mt-1 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div className="space-y-1 text-[var(--dash-text-secondary)]">
            <div className="font-bold text-[var(--dash-text)]">Effect Up LLC</div>
            <div>4008 Destination Dr Apt 2208</div>
            <div>Osprey, FL 34229</div>
            <div>(561) 376-2428</div>
          </div>
          <div className="space-y-1 text-[var(--dash-text-secondary)] sm:text-right">
            <div><span className="font-semibold text-[var(--dash-text)]">Date:</span> {fmtDate(invoice.invoice_date)}</div>
            <div><span className="font-semibold text-[var(--dash-text)]">Due Date:</span> {fmtDate(invoice.due_date)}</div>
            <div><span className="font-semibold text-[var(--dash-text)]">Status:</span> <span className="font-bold" style={{ color: isPaid ? "var(--dash-green)" : "var(--dash-badge-unpaid-text)" }}>{isPaid ? "PAID" : "UNPAID"}{isPaid && invoice.payment_method ? ` · ${invoice.payment_method}` : ""}</span></div>
          </div>
        </div>

        <hr className="my-4 border-[var(--dash-border)]" />
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="font-bold text-[var(--dash-text)]">Bill To:</div>
            <div className="mt-1 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{invoice.client?.name}</div>
              {invoice.client?.address && <div>{invoice.client.address}</div>}
              {invoice.client?.city && <div>{invoice.client.city}</div>}
              {invoice.client?.phone && <div>{formatPhone(invoice.client.phone)}</div>}
              {invoice.client?.email && <div>{invoice.client.email}</div>}
            </div>
          </div>
          <div>
            <div className="font-bold text-[var(--dash-text)]">Service Address:</div>
            <div className="mt-1 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{invoice.client?.address || "—"}</div>
              <div>{invoice.client?.city || ""}</div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 font-bold text-[var(--dash-text)]">Requested Services</div>
          <div className="overflow-x-auto rounded-[11px] border border-[var(--dash-border-table)]">
            <table className="w-full min-w-[640px] text-sm">
              <thead style={{ background: "var(--dash-navy)" }} className="text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Service</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Description</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Unit Price</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-[var(--dash-border-table)] align-top">
                    <td className="px-4 py-3 font-bold text-[var(--dash-text)]">
                      <div className="flex items-center gap-2"><Wrench className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} /> {it.service || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--dash-text-secondary)]">{it.description}</td>
                    <td className="px-4 py-3 text-[var(--dash-text-secondary)]">{it.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(it.rate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm sm:w-72">
            <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base"><span className="font-semibold">Total</span><span className="font-extrabold tabular-nums" style={{ color: isPaid ? "var(--dash-green)" : "var(--dash-text)" }}>{fmt(invoice.total)}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

type LineRow = { service: string; description: string; qty: number; rate: number };

function NewInvoiceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates, enabled: open });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices, enabled: open });
  const qc = useQueryClient();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [clientId, setClientId] = useState("");
  const [estimateId, setEstimateId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("UNPAID");
  const [items, setItems] = useState<LineRow[]>([{ service: "Pool Cleaning", description: "Standard cleaning", qty: 1, rate: 100 }]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.rate, 0), [items]);
  const total = subtotal;

  function applyEstimate(id: string) {
    setEstimateId(id);
    if (!id) return;
    const e = estimates.find((x) => x.id === id);
    if (e) {
      setClientId(e.client_id);
      setItems((e.estimate_items ?? []).map((it) => ({ service: it.name, description: it.description, qty: Number(it.qty), rate: Number(it.unit_price) })));
    }
  }

  // Picking a client directly (no estimate) pre-fills a single line using
  // that client's own monthly pool value, instead of the generic $100 default.
  function applyClient(id: string) {
    setClientId(id);
    if (!id || estimateId) return;
    const c = clients.find((x) => x.id === id);
    if (c) {
      setItems([{ service: "Pool Cleaning", description: "Standard cleaning", qty: 1, rate: Number(c.monthly_value ?? 0) }]);
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
        number, due_date: dueDate || null, status, subtotal, tax: 0, total,
      }).select().single();
      if (error) throw error;
      const rows = items.map((it, idx) => ({
        invoice_id: inv.id, service: it.service, description: it.description, qty: it.qty, rate: it.rate,
        amount: it.qty * it.rate, position: idx,
      }));
      const { error: e2 } = await supabase.from("invoice_items").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Invoice created!");
      setClientId(""); setEstimateId(""); setDueDate(""); setStatus("UNPAID");
      setItems([{ service: "Pool Cleaning", description: "Standard cleaning", qty: 1, rate: 100 }]);
      onCreated(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAsServiceMut = useMutation({
    mutationFn: (it: LineRow) => createService({ name: it.service, description: it.description, unit_price: it.rate }),
    onSuccess: () => { toast.success("Serviço salvo!"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
    <Modal open={open} onClose={onClose} title="New Invoice" maxWidth="max-w-3xl">
      {clients.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[var(--dash-text-secondary)]">You need to create a client first.</p>
          <Link to="/clientes" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)] hover:underline">Go to Clients →</Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          {estimates.length > 0 && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Create from Estimate (optional)</label>
              <select value={estimateId} onChange={(e) => applyEstimate(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
                <option value="">— None —</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.number} — {e.client?.name} ({fmt(e.total)})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Client *</label>
              <select value={clientId} onChange={(e) => applyClient(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
                <option value="">Select...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Items</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCatalogOpen(true)} className="text-xs font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]">Manage saved services</button>
                <ServicePicker onPick={(s) => setItems([...items, { service: s.name, description: s.description || "", qty: 1, rate: Number(s.unit_price) }])} />
                <button type="button" onClick={() => setItems([...items, { service: "", description: "", qty: 1, rate: 0 }])} className="text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)]">+ Add item</button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="col-span-3 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Service" value={it.service} onChange={(e) => { const n = [...items]; n[idx].service = e.target.value; setItems(n); }} />
                  <input className="col-span-3 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Qty" value={it.qty} onChange={(e) => { const n = [...items]; n[idx].qty = Number(e.target.value); setItems(n); }} />
                  <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Rate" value={it.rate} onChange={(e) => { const n = [...items]; n[idx].rate = Number(e.target.value); setItems(n); }} />
                  <button type="button" title="Save as reusable service" onClick={() => it.service.trim() && saveAsServiceMut.mutate(it)} className="col-span-1 grid place-items-center rounded-[10px] border border-[var(--dash-border-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-navy)]"><Save className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 grid place-items-center rounded-[10px] border border-[var(--dash-border-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-red)]"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums" style={{ color: "var(--dash-navy)" }}>{fmt(total)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
            <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {mut.isPending ? "Saving..." : "Create Invoice"}
            </button>
          </div>
        </form>
      )}
    </Modal>
    <ServiceCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </>
  );
}

function EditInvoiceModal({ invoice, open, onClose, onSaved }: { invoice: Invoice; open: boolean; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [dueDate, setDueDate] = useState(invoice.due_date || "");
  const [status, setStatus] = useState(invoice.status);
  const [items, setItems] = useState<LineRow[]>(
    (invoice.invoice_items ?? []).slice().sort((a, b) => a.position - b.position).map((it) => ({
      service: it.service,
      description: it.description,
      qty: it.qty,
      rate: it.rate,
    }))
  );

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.rate, 0), [items]);
  const total = subtotal;

  const mut = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Add at least one item");
      const { error: invErr } = await supabase
        .from("invoices")
        .update({ due_date: dueDate || null, status, subtotal, tax: 0, total })
        .eq("id", invoice.id);
      if (invErr) throw invErr;
      const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
      if (delErr) throw delErr;
      const rows = items.map((it, idx) => ({
        invoice_id: invoice.id,
        service: it.service,
        description: it.description,
        qty: it.qty,
        rate: it.rate,
        amount: it.qty * it.rate,
        position: idx,
      }));
      const { error: insErr } = await supabase.from("invoice_items").insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: () => { toast.success("Invoice updated!"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAsServiceMut = useMutation({
    mutationFn: (it: LineRow) => createService({ name: it.service, description: it.description, unit_price: it.rate }),
    onSuccess: () => { toast.success("Serviço salvo!"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
    <Modal open={open} onClose={onClose} title={`Edit ${invoice.number}`} maxWidth="max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <div className="rounded-[10px] bg-[var(--dash-bg)] px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Client</div>
          <div className="text-base font-extrabold text-[var(--dash-text)]">{invoice.client?.name || "—"}</div>
          {invoice.client?.address && <div className="text-sm text-[var(--dash-text-secondary)]">{invoice.client.address}{invoice.client.city ? `, ${invoice.client.city}` : ""}</div>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Items</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCatalogOpen(true)} className="text-xs font-semibold text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]">Manage saved services</button>
              <ServicePicker onPick={(s) => setItems([...items, { service: s.name, description: s.description || "", qty: 1, rate: Number(s.unit_price) }])} />
              <button type="button" onClick={() => setItems([...items, { service: "", description: "", qty: 1, rate: 0 }])} className="text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)]">+ Add item</button>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input className="col-span-3 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Service" value={it.service} onChange={(e) => { const n = [...items]; n[idx].service = e.target.value; setItems(n); }} />
                <input className="col-span-3 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Qty" value={it.qty} onChange={(e) => { const n = [...items]; n[idx].qty = Number(e.target.value); setItems(n); }} />
                <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Rate" value={it.rate} onChange={(e) => { const n = [...items]; n[idx].rate = Number(e.target.value); setItems(n); }} />
                <button type="button" title="Save as reusable service" onClick={() => it.service.trim() && saveAsServiceMut.mutate(it)} className="col-span-1 grid place-items-center rounded-[10px] border border-[var(--dash-border-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-navy)]"><Save className="h-4 w-4" /></button>
                <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 grid place-items-center rounded-[10px] border border-[var(--dash-border-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-red)]"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
            <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums" style={{ color: "var(--dash-navy)" }}>{fmt(total)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
          <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
    <ServiceCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </>
  );
}
