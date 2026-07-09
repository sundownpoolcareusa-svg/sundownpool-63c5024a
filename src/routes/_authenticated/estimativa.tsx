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

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const tabs = ["All", "Pending", "Sent", "Approved", "Expired"];
const tabStatus: Record<string, string | null> = {
  All: null, Pending: "PENDENTE", Sent: "ENVIADA", Approved: "APROVADA", Expired: "EXPIRADA",
};

function statusBadge(s: string) {
  const map: Record<string, { bg: string; text: string }> = {
    PENDENTE: { bg: "var(--dash-badge-unpaid-bg)", text: "var(--dash-badge-unpaid-text)" },
    APROVADA: { bg: "var(--dash-badge-paid-bg)", text: "var(--dash-badge-paid-text)" },
    ENVIADA: { bg: "var(--dash-badge-sent-bg)", text: "var(--dash-badge-sent-text)" },
    EXPIRADA: { bg: "var(--dash-badge-expired-bg)", text: "var(--dash-badge-expired-text)" },
  };
  const labels: Record<string, string> = { PENDENTE: "Pending", APROVADA: "Approved", ENVIADA: "Sent", EXPIRADA: "Expired" };
  const c = map[s] ?? { bg: "var(--dash-border-table)", text: "var(--dash-text-muted-2)" };
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: c.bg, color: c.text }}>
      {labels[s] ?? s}
    </span>
  );
}

function EstimativaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [tab, setTab] = useState("All");
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
    <div className="dash min-h-screen bg-[var(--dash-bg)]">
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12">
        {/* LEFT */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-extrabold text-[var(--dash-text)]">Estimates</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> New Estimate
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search estimates..." className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-[11px] border border-[var(--dash-border-input)] bg-white text-[var(--dash-navy)]"><Filter className="h-4 w-4" /></button>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
              <p className="mt-2 text-sm text-[var(--dash-text-muted-2)]">No estimates</p>
              <p className="text-xs text-[var(--dash-text-muted)]">Click "New Estimate".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="block w-full rounded-[18px] border p-4 text-left"
                  style={{
                    borderColor: selected?.id === e.id ? "var(--dash-navy)" : "var(--dash-border)",
                    background: selected?.id === e.id ? "var(--dash-water-bg)" : "#fff",
                    ...cardShadow,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[var(--dash-navy)]">{e.number}</div>
                    {statusBadge(e.status)}
                  </div>
                  <div className="mt-1 text-sm text-[var(--dash-text-secondary)]">{e.client?.name}</div>
                  <div className="text-xs text-[var(--dash-text-muted)]">{e.title || "—"}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-xs text-[var(--dash-text-muted)]">{fmtDate(e.estimate_date)}</div>
                    <div className="font-bold tabular-nums text-[var(--dash-text)]">{fmt(e.total)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CENTER */}
        <section className="space-y-4 lg:col-span-6">
          {selected ? (
            <EstimateDetail
              estimate={selected}
              onEdit={() => setEditing(selected)}
              onDelete={() => {
                if (confirm(`Delete estimate ${selected.number}?`)) del.mutate(selected.id);
              }}
            />

          ) : (
            <div className="rounded-[18px] border-2 border-dashed border-[var(--dash-border)] bg-white p-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-[var(--dash-text-muted)]" />
              <p className="mt-4 text-lg font-semibold text-[var(--dash-text-secondary)]">No estimates</p>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">Create your first estimate.</p>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 lg:col-span-3">
          {selected && (
            <>
              <h3 className="text-lg font-extrabold text-[var(--dash-text)]">Estimate Summary</h3>
              <div className="overflow-hidden rounded-[18px] border border-[var(--dash-border)] bg-white" style={cardShadow}>
                <img src={poolImg} alt="Pool" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
                <div className="space-y-3 p-[18px] text-sm">
                  <Row icon={ListChecks} label="Services" value={`${(selected.estimate_items ?? []).length} items`} />
                  <Row icon={CalendarDays} label="Valid until" value={fmtDate(selected.valid_until)} />
                  <Row icon={Clock} label="Estimated time" value="To be agreed" />
                  <Row icon={ShieldCheck} label="Warranty" value="30 days" />
                </div>
              </div>
              <div className="rounded-[18px] border p-[18px]" style={{ borderColor: "var(--dash-border)", background: "var(--dash-water-bg)" }}>
                <div className="font-bold" style={{ color: "var(--dash-navy)" }}>Next Steps</div>
                <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">Approve the estimate to generate the invoice.</p>
                <button
                  disabled={selected.status === "APROVADA" || approve.isPending}
                  onClick={() => approve.mutate(selected.id)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--dash-green)" }}
                >
                  <CheckCircle2 className="h-4 w-4" /> {selected.status === "APROVADA" ? "Approved" : "Approve Estimate"}
                </button>
                {selected.status === "APROVADA" && (
                  <Link to="/invoice" className="mt-2 flex w-full items-center justify-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white py-2.5 text-sm font-semibold" style={{ color: "var(--dash-navy)" }}>
                    Generate Invoice →
                  </Link>
                )}
              </div>
              <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]" style={cardShadow}>
                <div className="font-bold text-[var(--dash-text)]">Questions?</div>
                <p className="text-sm text-[var(--dash-text-secondary)]">We are here to help!</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[var(--dash-text-secondary)]"><Phone className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> (561) 376-2428</div>
                </div>
              </div>
            </>
          )}
        </aside>
      </main>

      <EstimateFormModal
        open={open || !!editing}
        editing={editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["estimates"] })}
      />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[var(--dash-text-secondary)]"><Icon className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> {label}</div>
      <span className="font-semibold text-[var(--dash-text)]">{value}</span>
    </div>
  );
}

function EstimateDetail({ estimate, onEdit, onDelete }: { estimate: Estimate; onEdit: () => void; onDelete: () => void }) {
  const items = (estimate.estimate_items ?? []).slice().sort((a, b) => a.position - b.position);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { share, modal: shareModal } = useShareLink();
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${estimate.public_token}`;
  return (
    <>
      {shareModal}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-[var(--dash-text)] sm:text-xl">Estimate #{estimate.number}</h2>
          {statusBadge(estimate.status)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => share(publicUrl, `Estimate ${estimate.number}`)}
            className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]"
          >
            <Link2 className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Send
          </button>
          <button
            onClick={() => {
              if (!pdfRef.current) return;
              const fname = `${estimate.client?.name || "Client"} ${estimate.number}`;
              downloadElementAsPdf(pdfRef.current, fname);
            }}
            className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]"
          >
            <Download className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> PDF
          </button>
          <button onClick={onEdit} className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)]">
            <Pencil className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--dash-red-border)", color: "var(--dash-red)" }}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-[11px] border border-[var(--dash-border)] bg-white text-[var(--dash-text-secondary)]"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={pdfRef} className="pdf-print rounded-[20px] border border-[var(--dash-border)] bg-white px-[26px] pb-[26px] pt-1" style={cardShadow}>
        <DocCardHeader title="ESTIMATE" number={estimate.number} />
        <div className="mt-1 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div className="space-y-1 text-[var(--dash-text-secondary)]">
            <div>4008 Destination Dr</div>
            <div>Osprey, FL 34229</div>
            <div>(561) 376-2428</div>
          </div>
          <div className="space-y-1 text-[var(--dash-text-secondary)] sm:text-right">
            <div><span className="font-semibold text-[var(--dash-text)]">Date:</span> {fmtDate(estimate.estimate_date)}</div>
            <div><span className="font-semibold text-[var(--dash-text)]">Valid until:</span> {fmtDate(estimate.valid_until)}</div>
          </div>
        </div>

        <hr className="my-4 border-[var(--dash-border)]" />
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 font-bold text-[var(--dash-text)]"><User className="h-4 w-4" /> Client</div>
            <div className="mt-2 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{estimate.client?.name}</div>
              {estimate.client?.phone && <div>{formatPhone(estimate.client.phone)}</div>}
              {estimate.client?.email && <div>{estimate.client.email}</div>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-[var(--dash-text)]"><MapPin className="h-4 w-4" /> Service Address</div>
            <div className="mt-2 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{estimate.client?.address || "—"}</div>
              <div>{estimate.client?.city || ""}</div>
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
                {items.map((s, i) => (
                  <tr key={i} className="border-t border-[var(--dash-border-table)] align-top">
                    <td className="px-4 py-3 font-bold text-[var(--dash-text)]"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} /> {s.name}</div></td>
                    <td className="px-4 py-3 text-[var(--dash-text-secondary)]">{s.description}</td>
                    <td className="px-4 py-3 text-[var(--dash-text-secondary)]">{s.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(s.unit_price))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(s.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="font-bold text-[var(--dash-text)]">Notes</div>
            <p className="mt-2 text-sm text-[var(--dash-text-secondary)] whitespace-pre-line">{estimate.notes || "—"}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(estimate.subtotal)}</span></div>
            <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Discount</span><span className="tabular-nums" style={{ color: "var(--dash-green)" }}>-{fmt(estimate.discount)}</span></div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--dash-border)] pt-2">
              <span className="text-base font-bold text-[var(--dash-text)]">Total</span>
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--dash-navy)" }}>{fmt(estimate.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type ItemRow = { name: string; description: string; qty: number; unit_price: number };


function EstimateFormModal({
  open, editing, onClose, onSaved,
}: {
  open: boolean;
  editing: Estimate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: open });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: listEstimates, enabled: open });

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Pool Cleaning & Maintenance");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Prices may change after on-site inspection.");
  const [items, setItems] = useState<ItemRow[]>([
    { name: "Pool Cleaning", description: "Vacuuming and brushing", qty: 1, unit_price: 100 },
  ]);

  // Load editing values when modal opens with an estimate
  const editingId = editing?.id ?? null;
  useMemo(() => {
    if (editing) {
      setClientId(editing.client_id);
      setTitle(editing.title ?? "");
      setValidUntil(editing.valid_until ?? "");
      setDiscount(Number(editing.discount) || 0);
      setNotes(editing.notes ?? "");
      const sorted = (editing.estimate_items ?? []).slice().sort((a, b) => a.position - b.position);
      setItems(sorted.length ? sorted.map((it) => ({
        name: it.name, description: it.description ?? "", qty: Number(it.qty), unit_price: Number(it.unit_price),
      })) : [{ name: "", description: "", qty: 1, unit_price: 0 }]);
    }
  }, [editingId]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.unit_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);

  const resetForm = () => {
    setClientId(""); setTitle("Pool Cleaning & Maintenance"); setValidUntil("");
    setDiscount(0); setNotes("Prices may change after on-site inspection.");
    setItems([{ name: "Pool Cleaning", description: "Vacuuming and brushing", qty: 1, unit_price: 100 }]);
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Select a client");
      if (items.length === 0) throw new Error("Add at least one item");
      if (editing) {
        const { error } = await supabase.from("estimates").update({
          client_id: clientId, title, valid_until: validUntil || null,
          subtotal, discount, total, notes,
        }).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("estimate_items").delete().eq("estimate_id", editing.id);
        const rows = items.map((it, idx) => ({
          estimate_id: editing.id, name: it.name, description: it.description,
          qty: it.qty, unit_price: it.unit_price, total: it.qty * it.unit_price, position: idx,
        }));
        const { error: e2 } = await supabase.from("estimate_items").insert(rows);
        if (e2) throw e2;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not authenticated");
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
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Estimate updated!" : "Estimate created!");
      if (!editing) resetForm();
      onSaved(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit Estimate ${editing.number}` : "New Estimate"} maxWidth="max-w-3xl" closeOnOverlayClick={false}>
      {clients.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[var(--dash-text-secondary)]">You need to create a client first.</p>
          <Link to="/clientes" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)] hover:underline">Go to Clients →</Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
                <option value="">Select...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Valid until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Services</label>
              <button type="button" onClick={() => setItems([...items, { name: "", description: "", qty: 1, unit_price: 0 }])} className="text-sm font-semibold text-[var(--dash-link)] hover:text-[var(--dash-link-hover)]">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="col-span-3 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Service" value={it.name} onChange={(e) => { const n = [...items]; n[idx].name = e.target.value; setItems(n); }} />
                  <input className="col-span-5 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <input className="col-span-1 rounded-[10px] border border-[var(--dash-border-input)] px-2 py-2 text-sm" type="number" step="0.01" placeholder="Qty" value={it.qty} onChange={(e) => { const n = [...items]; n[idx].qty = Number(e.target.value); setItems(n); }} />
                  <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Price" value={it.unit_price} onChange={(e) => { const n = [...items]; n[idx].unit_price = Number(e.target.value); setItems(n); }} />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 grid place-items-center rounded-[10px] border border-[var(--dash-border-input)] text-[var(--dash-text-muted)] hover:text-[var(--dash-red)]"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              <div className="flex items-center justify-between text-[var(--dash-text-secondary)]"><span>Discount</span><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded-[10px] border border-[var(--dash-border-input)] px-2 py-1 text-right text-sm" /></div>
              <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums" style={{ color: "var(--dash-navy)" }}>{fmt(total)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
            <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {mut.isPending ? "Saving..." : editing ? "Save Changes" : "Create Estimate"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
