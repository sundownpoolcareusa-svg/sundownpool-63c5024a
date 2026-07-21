import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import {
  Plus, Search, Filter, Eye, Smartphone, Share2, Upload, ChevronDown,
  ChevronLeft, ChevronRight, Pencil, Trash2, Users, Map,
} from "lucide-react";
import { listClients, listTechnicians, removeStaleClientStops, fmtDate, initials, fmt, type Client, type Invoice, type ClientContact } from "@/lib/db";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { PhotoUploader, PhotoThumb } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

function formatPhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "").slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);
  if (digits.length <= 3) return p1 ? `(${p1}` : "";
  if (digits.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const avatarColors = [
  "bg-sky-200 text-sky-800", "bg-orange-200 text-orange-800", "bg-purple-200 text-purple-800",
  "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800", "bg-green-200 text-green-800",
  "bg-cyan-200 text-cyan-800", "bg-amber-200 text-amber-800",
];

type ClientFull = Client & {
  address?: string | null; city?: string | null; state?: string | null; zip?: string | null;
  service_days?: string[] | null; notes?: string | null;
  monthly_value?: number | null;
  pool_photos?: string[] | null;
  equipment_photos?: string[] | null;
  gate_code?: string | null;
  contacts?: ClientContact[] | null;
};

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [onRouteOnly, setOnRouteOnly] = useState(false);
  const [viewClient, setViewClient] = useState<ClientFull | null>(null);
  const [editClient, setEditClient] = useState<ClientFull | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientFull | null>(null);
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: listClients });

  const isOnRoute = (c: Client) => (c.service_days ?? []).length > 0;

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRoute = !onRouteOnly || isOnRoute(c);
    return matchesSearch && matchesRoute;
  });

  const total = clients.length;
  const ativos = clients.filter((c) => c.status === "Ativo").length;
  const onRouteCount = clients.filter(isOnRoute).length;
  const prospectCount = clients.filter((c) => c.stage === "Prospecção").length;
  const now = new Date();
  const novos = clients.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteClient(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-extrabold text-[var(--dash-text)]">Clients</h1>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> New Client
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="w-full rounded-[11px] border border-[var(--dash-border-input)] bg-white py-2 pl-9 pr-3 text-sm" />
          </div>

          <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]" style={cardShadow}>
            <div className="border-b border-[var(--dash-border)] pb-2 font-bold text-[var(--dash-text)]">Summary</div>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">Total Clients</span><span className="font-bold tabular-nums text-[var(--dash-text)]">{total}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">Active Clients</span><span className="font-bold tabular-nums" style={{ color: "var(--dash-green)" }}>{ativos}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">On Route</span><span className="font-bold tabular-nums" style={{ color: "#7C3AED" }}>{onRouteCount}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">Prospects</span><span className="font-bold tabular-nums" style={{ color: "#B45309" }}>{prospectCount}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">New this month</span><span className="font-bold tabular-nums" style={{ color: "var(--dash-navy)" }}>{novos}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dash-text-secondary)]">Services this month</span><span className="font-bold tabular-nums" style={{ color: "var(--dash-orange)" }}>0</span></div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]" style={cardShadow}>
            <div className="font-bold text-[var(--dash-text)]">Upcoming Services</div>
            <p className="mt-3 text-sm text-[var(--dash-text-muted)]">No scheduled services.</p>
          </div>

          <div
            className="rounded-[18px] border border-[var(--dash-border)] p-[18px]"
            style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))", ...cardShadow }}
          >
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-white" />
              <div>
                <div className="font-bold text-white">Client Portal</div>
                <p className="mt-1 text-xs text-white/80">Your clients can schedule services, view history and receive invoices.</p>
              </div>
            </div>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] border border-white/30 bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/20">
              <Share2 className="h-4 w-4" /> Share Link
            </button>
          </div>
        </aside>

        <section className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4 sm:p-6 lg:col-span-9" style={cardShadow}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-[var(--dash-text)] sm:text-2xl">Client List</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm text-[var(--dash-text-secondary)]">All statuses <ChevronDown className="h-4 w-4" /></button>
              <button
                onClick={() => setOnRouteOnly((v) => !v)}
                className="flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-semibold"
                style={{
                  borderColor: onRouteOnly ? "#7C3AED" : "var(--dash-border)",
                  background: onRouteOnly ? "#EDE4FB" : "#fff",
                  color: onRouteOnly ? "#7C3AED" : "var(--dash-text-secondary)",
                }}
              >
                <Map className="h-4 w-4" /> On Route
              </button>
              <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm text-[var(--dash-text-secondary)]"><Filter className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Filter</button>
              <button className="flex items-center gap-2 rounded-[11px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm text-[var(--dash-text-secondary)]"><Upload className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> Export</button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
              <p className="mt-3 font-semibold text-[var(--dash-text-secondary)]">No clients registered</p>
              <p className="text-sm text-[var(--dash-text-muted)]">Clique em "New Client" para começar.</p>
              <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Add first client
              </button>
            </div>
          ) : (
            <>
              <div className="-mx-4 mt-5 overflow-x-auto sm:mx-0"><table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--dash-border-table)] text-left text-[var(--dash-text-muted)]">
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Client</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Contact</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Address</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Pool Value</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Day</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Registered</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Status</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} className="border-b border-[var(--dash-border-table)]">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${avatarColors[idx % avatarColors.length]}`}>
                            {initials(c.name)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-bold text-[var(--dash-text)]">{c.name}</div>
                            <div className="text-xs text-[var(--dash-text-muted)]">{c.client_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-[var(--dash-text)]">{c.phone ? formatPhone(c.phone) : "—"}</div>
                        <div className="text-xs text-[var(--dash-link)]">{c.email || "—"}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-[var(--dash-text)]">{(c as ClientFull).address || "—"}</div>
                        <div className="text-xs text-[var(--dash-text-muted)]">{c.city || ""}</div>
                      </td>
                      <td className="py-4 font-semibold tabular-nums text-[var(--dash-text)]">
                        {(c as ClientFull).monthly_value ? fmt(Number((c as ClientFull).monthly_value)) : "—"}
                      </td>
                      <td className="py-4 text-[var(--dash-text-secondary)]">
                        {(c.service_days && c.service_days.length) ? c.service_days.join(", ") : "—"}
                      </td>
                      <td className="py-4 text-[var(--dash-text-secondary)]">{fmtDate(c.created_at)}</td>
                      <td className="py-4">
                        {c.status !== "Ativo" ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ background: "var(--dash-border-table)", color: "var(--dash-text-muted-2)" }}
                          >
                            Inativo
                          </span>
                        ) : isOnRoute(c) ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ background: "#EDE4FB", color: "#7C3AED" }}
                            title="Has recurring service days scheduled on a route"
                          >
                            Route
                          </span>
                        ) : c.stage === "Prospecção" ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ background: "#FEF3C7", color: "#B45309" }}
                          >
                            Prospecção
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ background: "var(--dash-badge-paid-bg)", color: "var(--dash-badge-paid-text)" }}
                          >
                            Cliente
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewClient(c as ClientFull)}
                            title="View details"
                            className="hover:opacity-70"
                            style={{ color: "var(--dash-navy)" }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditClient(c as ClientFull)}
                            title="Edit"
                            className="hover:opacity-70"
                            style={{ color: "var(--dash-navy)" }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteClient(c as ClientFull)}
                            title="Delete"
                            className="hover:opacity-70"
                            style={{ color: "var(--dash-red)" }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <div className="text-[var(--dash-text-muted)]">Showing {filtered.length} of {total} clients</div>
                <div className="flex items-center gap-1">
                  <button className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)]"><ChevronLeft className="h-4 w-4" /></button>
                  <button className="grid h-8 min-w-8 place-items-center rounded-[8px] px-2 text-white" style={{ background: "var(--dash-navy)", borderColor: "var(--dash-navy)" }}>1</button>
                  <button className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)]"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <ClientFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />
      <ClientFormModal
        open={!!editClient}
        onClose={() => setEditClient(null)}
        editing={editClient}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />

      <Modal open={!!viewClient} onClose={() => setViewClient(null)} title="Client Details">
        {viewClient && (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={viewClient.name} />
            <Row label="Type" value={viewClient.client_type} />
            <Row label="Status" value={viewClient.status} />
            <Row label="Email" value={viewClient.email || "—"} />
            <Row label="Phone" value={viewClient.phone ? formatPhone(viewClient.phone) : "—"} />
            <Row label="Address" value={viewClient.address || "—"} />
            <div className="grid grid-cols-3 gap-3">
              <Row label="City" value={viewClient.city || "—"} />
              <Row label="State" value={viewClient.state || "—"} />
              <Row label="Zipcode" value={viewClient.zip || "—"} />
            </div>
            <Row label="Service days" value={(viewClient.service_days && viewClient.service_days.length) ? viewClient.service_days.join(", ") : "—"} />
            <Row label="Monthly value" value={fmt(Number(viewClient.monthly_value || 0))} />
            <Row label="Gate code" value={viewClient.gate_code || "—"} />
            {(viewClient.contacts && viewClient.contacts.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Additional contacts</div>
                <div className="mt-1 space-y-1">
                  {viewClient.contacts.map((c, i) => (
                    <div key={i} className="text-[var(--dash-text)]">{c.name} — {c.phone ? formatPhone(c.phone) : "—"}</div>
                  ))}
                </div>
              </div>
            )}
            <Row label="Notes" value={viewClient.notes || "—"} />
            <Row label="Registered" value={fmtDate(viewClient.created_at)} />
            {(viewClient.pool_photos && viewClient.pool_photos.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Pool photos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewClient.pool_photos.map((p) => <PhotoThumb key={p} path={p} />)}
                </div>
              </div>
            )}
            {(viewClient.equipment_photos && viewClient.equipment_photos.length > 0) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">Equipment photos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewClient.equipment_photos.map((p) => <PhotoThumb key={p} path={p} />)}
                </div>
              </div>
            )}
            <ClientInvoicesHistory clientId={viewClient.id} />
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewClient(null)} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteClient} onClose={() => setDeleteClient(null)} title="Delete client" maxWidth="max-w-md">
        {deleteClient && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--dash-text-secondary)]">
              Are you sure you want to delete <b>{deleteClient.name}</b>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteClient(null)} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
              <button
                disabled={delMut.isPending}
                onClick={() => delMut.mutate(deleteClient.id)}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--dash-red)" }}
              >
                {delMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">{label}</div>
      <div className="text-[var(--dash-text)]">{value}</div>
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

function ClientFormModal({
  open, onClose, onSaved, editing,
}: { open: boolean; onClose: () => void; onSaved: () => void; editing?: ClientFull | null }) {
  const empty = {
    name: "", email: "", phone: "", address: "", city: "", state: "", zip: "",
    client_type: "Residential", status: "Ativo", stage: "Prospecção", service_days: [] as string[],
    monthly_value: 0 as number,
    pool_photos: [] as string[],
    equipment_photos: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
    technician_id: null as string | null,
    gate_code: "",
    contacts: [] as ClientContact[],
  };
  const [form, setForm] = useState(empty);
  const [userId, setUserId] = useState<string>("anon");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); }); }, []);
  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians, enabled: open });

  // reset when editing changes
  const editingId = editing?.id ?? null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && editingId !== loadedId) {
    if (editing) {
      setForm({
        name: editing.name || "",
        email: editing.email || "",
        phone: editing.phone || "",
        address: editing.address || "",
        city: editing.city || "",
        state: editing.state || "",
        zip: editing.zip || "",
        client_type: editing.client_type || "Residential",
        status: editing.status || "Ativo",
        stage: editing.stage || "Cliente",
        service_days: editing.service_days || [],
        monthly_value: Number(editing.monthly_value || 0),
        pool_photos: editing.pool_photos || [],
        equipment_photos: editing.equipment_photos || [],
        lat: editing.lat ?? null,
        lng: editing.lng ?? null,
        technician_id: editing.technician_id ?? null,
        gate_code: editing.gate_code || "",
        contacts: editing.contacts || [],
      });
    } else {
      setForm(empty);
    }
    setLoadedId(editingId);
  }
  if (!open && loadedId !== null) setLoadedId(null);

  const toggleDay = (d: string) =>
    setForm((f) => ({ ...f, service_days: f.service_days.includes(d) ? f.service_days.filter((x) => x !== d) : [...f.service_days, d] }));

  const mut = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editing) {
        const { error } = await supabase.from("clients").update(values).eq("id", editing.id);
        if (error) throw error;
        await removeStaleClientStops(editing.id, values.service_days);
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not authenticated");
        const { error } = await supabase.from("clients").insert({ ...values, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Client updated!" : "Client created!");
      setForm(empty);
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Client" : "New Client"}>
      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        className="space-y-4"
      >
        <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={formatPhone(form.phone)} onChange={(v) => setForm({ ...form, phone: formatPhone(v) })} />
        </div>
        <div>
          {form.contacts.map((c, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                value={c.name}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  contacts: f.contacts.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)),
                }))}
                placeholder="Contact name"
                className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
              <input
                value={formatPhone(c.phone)}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  contacts: f.contacts.map((x, xi) => (xi === i ? { ...x, phone: formatPhone(e.target.value) } : x)),
                }))}
                placeholder="Contact phone"
                className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, contacts: f.contacts.filter((_, xi) => xi !== i) }))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-red)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: "", phone: "" }] }))}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--dash-link)" }}
          >
            <Plus className="h-3 w-3" /> Add contact
          </button>
        </div>
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onSelectPlace={(p) => setForm((f) => ({
            ...f,
            address: p.address,
            city: p.city || f.city,
            state: p.state || f.state,
            zip: p.zip || f.zip,
            lat: p.lat ?? f.lat,
            lng: p.lng ?? f.lng,
          }))}
        />
        <div className="grid grid-cols-3 gap-4">
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="Zipcode" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
        </div>
        <Field label="Gate code" value={form.gate_code} onChange={(v) => setForm({ ...form, gate_code: v })} />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Type</label>
            <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Residential</option><option>Commercial</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Ativo</option><option>Inativo</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Stage</label>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm">
              <option>Cliente</option><option>Prospecção</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Recurring Service Days</label>
          <p className="text-xs text-[var(--dash-text-muted)]">Select one or more days of the week</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const active = form.service_days.includes(d.v);
              return (
                <button
                  type="button"
                  key={d.v}
                  onClick={() => toggleDay(d.v)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    borderColor: active ? "var(--dash-navy)" : "var(--dash-border)",
                    background: active ? "var(--dash-navy)" : "#fff",
                    color: active ? "#fff" : "var(--dash-text-secondary)",
                  }}
                >
                  {d.v}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Assigned Technician</label>
          <p className="text-xs text-[var(--dash-text-muted)]">Who normally services this client — required for recurring days to auto-schedule</p>
          <select
            value={form.technician_id ?? ""}
            onChange={(e) => setForm({ ...form, technician_id: e.target.value || null })}
            className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Monthly pool value (USD)</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--dash-text-muted)]">$</span>
            <input
              type="number" min="0" step="0.01"
              value={form.monthly_value}
              onChange={(e) => setForm({ ...form, monthly_value: Number(e.target.value) })}
              className="w-full rounded-[10px] border border-[var(--dash-border-input)] py-2 pl-7 pr-3 text-sm"
            />
          </div>
        </div>
        <PhotoUploader
          label="Pool photos"
          value={form.pool_photos}
          onChange={(v) => setForm({ ...form, pool_photos: v })}
          folder={`${userId}/pool`}
        />
        <PhotoUploader
          label="Equipment photos"
          value={form.equipment_photos}
          onChange={(v) => setForm({ ...form, equipment_photos: v })}
          folder={`${userId}/equipment`}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]">Cancel</button>
          <button disabled={mut.isPending} className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Saving..." : editing ? "Update Client" : "Save Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
    </div>
  );
}

function ClientInvoicesHistory({ clientId }: { clientId: string }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total || 0), 0);
  const totalOpen = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.total || 0), 0);

  return (
    <div className="mt-2 border-t border-[var(--dash-border)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--dash-text)]">Invoice History</h3>
        <div className="text-xs text-[var(--dash-text-muted)]">
          {invoices.length} total • <span className="font-semibold tabular-nums" style={{ color: "var(--dash-green)" }}>{fmt(totalPaid)} paid</span> • <span className="font-semibold tabular-nums" style={{ color: "var(--dash-badge-unpaid-text)" }}>{fmt(totalOpen)} open</span>
        </div>
      </div>
      {isLoading ? (
        <div className="py-4 text-center text-xs text-[var(--dash-text-muted)]">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--dash-border)] py-6 text-center text-xs text-[var(--dash-text-muted)]">
          No invoices yet for this client.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--dash-border-table)] text-left text-[var(--dash-text-muted)]">
                <th className="py-2 font-medium">Number</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Due</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--dash-border-table)]">
                  <td className="py-2 font-semibold text-[var(--dash-text)]">{inv.number}</td>
                  <td className="py-2 text-[var(--dash-text-secondary)]">{fmtDate(inv.invoice_date)}</td>
                  <td className="py-2 text-[var(--dash-text-secondary)]">{fmtDate(inv.due_date)}</td>
                  <td className="py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: inv.status === "PAID" ? "var(--dash-badge-paid-bg)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-bg)" : "var(--dash-badge-unpaid-bg)",
                        color: inv.status === "PAID" ? "var(--dash-badge-paid-text)" : inv.status === "OVERDUE" ? "var(--dash-badge-expired-text)" : "var(--dash-badge-unpaid-text)",
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[var(--dash-text)]">{fmt(Number(inv.total || 0))}</td>
                  <td className="py-2 text-right">
                    <Link to="/invoice" className="text-[var(--dash-link)] hover:text-[var(--dash-link-hover)] hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
