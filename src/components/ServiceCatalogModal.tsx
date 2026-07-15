import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { createService, deleteService, ensureDefaultServices, fmt } from "@/lib/db";

export function ServiceCatalogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: ensureDefaultServices, enabled: open });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  const createMut = useMutation({
    mutationFn: () => createService({ name, description, unit_price: unitPrice }),
    onSuccess: () => {
      toast.success("Serviço salvo!");
      setName(""); setDescription(""); setUnitPrice(0);
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Serviços Salvos" maxWidth="max-w-lg">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(); }}
        className="grid grid-cols-12 gap-2"
      >
        <input className="col-span-4 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="col-span-5 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="col-span-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" type="number" step="0.01" placeholder="Preço" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
        <button type="submit" disabled={createMut.isPending || !name.trim()} className="col-span-1 rounded-[10px] bg-[var(--dash-navy)] text-sm font-semibold text-white disabled:opacity-50">
          +
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {services.length === 0 && <p className="text-sm text-[var(--dash-text-muted)]">Nenhum serviço salvo ainda.</p>}
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--dash-border)] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--dash-text)]">{s.name}</div>
              <div className="truncate text-xs text-[var(--dash-text-muted)]">{s.description}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold text-[var(--dash-text)]">{fmt(s.unit_price)}</span>
              <button onClick={() => deleteMut.mutate(s.id)} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-red)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
