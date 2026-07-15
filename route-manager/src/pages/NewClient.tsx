import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getClient, upsertClient } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const empty = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  lat: null as number | null,
  lng: null as number | null,
  client_type: "Residencial",
  pool_capacity_gallons: "" as string | number,
  pool_filter_type: "",
  service_frequency: "Semanal",
};

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
    </div>
  );
}

export function NewClient() {
  const { clientId } = useParams<{ clientId: string }>();
  const isEditing = !!clientId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data: existing } = useQuery({ queryKey: ["client", clientId], queryFn: () => getClient(clientId!), enabled: isEditing });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        phone: existing.phone || "",
        email: existing.email || "",
        address: existing.address || "",
        city: existing.city || "",
        state: existing.state || "",
        zip: existing.zip || "",
        lat: existing.lat,
        lng: existing.lng,
        client_type: existing.client_type || "Residencial",
        pool_capacity_gallons: existing.pool_capacity_gallons ?? "",
        pool_filter_type: existing.pool_filter_type || "",
        service_frequency: existing.service_frequency || "Semanal",
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      await upsertClient({
        id: clientId,
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        lat: form.lat,
        lng: form.lng,
        client_type: form.client_type,
        pool_capacity_gallons: form.pool_capacity_gallons === "" ? null : Number(form.pool_capacity_gallons),
        pool_filter_type: form.pool_filter_type || null,
        service_frequency: form.service_frequency || null,
      } as any);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Cliente atualizado!" : "Cliente criado!");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      navigate(-1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen pb-8">
      <PageHeader
        title={isEditing ? "Editar Cliente" : "Novo Cliente"}
        action={<button onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar</button>}
      />

      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4 p-4">
        <Field label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onSelectPlace={(p) => setForm((f) => ({ ...f, address: p.address, city: p.city || f.city, state: p.state || f.state, zip: p.zip || f.zip, lat: p.lat, lng: p.lng }))}
        />
        <Field label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />

        <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-muted)]">
            Informações da Piscina
          </div>

          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Tipo de piscina</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {["Residencial", "Comercial"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm({ ...form, client_type: t })}
                className="rounded-[10px] border py-2 text-sm font-semibold"
                style={{
                  borderColor: form.client_type === t ? "var(--dash-navy)" : "var(--dash-border)",
                  background: form.client_type === t ? "var(--dash-navy)" : "#fff",
                  color: form.client_type === t ? "#fff" : "var(--dash-text-secondary)",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Field label="Capacidade (galões)" type="number" value={String(form.pool_capacity_gallons)} onChange={(v) => setForm({ ...form, pool_capacity_gallons: v })} />
          </div>
          <div className="mt-4">
            <Field label="Tipo de filtro" value={form.pool_filter_type} onChange={(v) => setForm({ ...form, pool_filter_type: v })} />
          </div>
          <div className="mt-4">
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Frequência</label>
            <select
              value={form.service_frequency}
              onChange={(e) => setForm({ ...form, service_frequency: e.target.value })}
              className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
            >
              <option>Semanal</option>
              <option>Quinzenal</option>
              <option>Mensal</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={mut.isPending} className="w-full rounded-[11px] bg-[var(--dash-navy)] py-3 text-sm font-semibold text-white disabled:opacity-50">
          {mut.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
