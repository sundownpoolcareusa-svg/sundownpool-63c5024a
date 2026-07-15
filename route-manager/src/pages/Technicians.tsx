import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTechnician, listTechnicians } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { TechnicianAvatar } from "@/components/TechnicianAvatar";

const COLORS = ["#16A34A", "#E8813A", "#7C3AED", "#1E5F9E", "#D0483F"];

export function Technicians() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const { data: technicians = [] } = useQuery({ queryKey: ["technicians"], queryFn: listTechnicians });

  const mut = useMutation({
    mutationFn: () => createTechnician({ name, phone, color }),
    onSuccess: () => {
      toast.success("Técnico adicionado!");
      setName(""); setPhone(""); setColor(COLORS[0]); setOpen(false);
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="Técnicos" action={<button onClick={() => setOpen((v) => !v)}><Plus className="ml-auto h-5 w-5" /></button>} />

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="space-y-3 border-b border-[var(--dash-border)] bg-white p-4"
        >
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Cor</label>
            <div className="mt-1 flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full"
                  style={{ background: c, outline: color === c ? "2px solid var(--dash-text)" : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
          <button disabled={mut.isPending} className="w-full rounded-[10px] bg-[var(--dash-navy)] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {mut.isPending ? "Salvando..." : "Adicionar técnico"}
          </button>
        </form>
      )}

      <div className="space-y-2.5 p-4">
        {technicians.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5">
            <TechnicianAvatar name={t.name} color={t.color} />
            <div>
              <div className="font-semibold text-[var(--dash-text)]">{t.name}</div>
              <div className="text-xs text-[var(--dash-text-muted)]">{t.phone || "—"}</div>
            </div>
          </div>
        ))}
        {technicians.length === 0 && <p className="text-center text-sm text-[var(--dash-text-muted)]">Nenhum técnico cadastrado.</p>}
      </div>
    </div>
  );
}
