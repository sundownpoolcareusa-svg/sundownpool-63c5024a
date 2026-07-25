import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import { TechAvatar } from "@/components/TechAvatar";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Plus, Pencil, UserX, HardHat } from "lucide-react";
import {
  listTechnicians,
  createTechnician,
  updateTechnician,
  deactivateTechnician,
  type Technician,
} from "@/lib/db";
import { toast } from "sonner";

function formatPhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "").slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);
  if (digits.length <= 3) return p1 ? `(${p1}` : "";
  if (digits.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}

export const Route = createFileRoute("/_authenticated/tecnicos")({
  component: TecnicosPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const COLORS = ["#16A34A", "#2563EB", "#DC2626", "#D97706", "#7C3AED", "#0891B2", "#DB2777"];

function TecnicosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [deactivating, setDeactivating] = useState<Technician | null>(null);
  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: listTechnicians,
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateTechnician(id),
    onSuccess: () => {
      toast.success("Technician removed");
      qc.invalidateQueries({ queryKey: ["technicians"] });
      setDeactivating(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-20 lg:pb-0 lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="p-3 sm:p-5">
        <section
          className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4 sm:p-6"
          style={cardShadow}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold text-[var(--dash-text)] sm:text-2xl">
              Technicians
            </h1>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New Technician
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : technicians.length === 0 ? (
            <div className="mt-8 rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-16 text-center">
              <HardHat className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
              <p className="mt-3 font-semibold text-[var(--dash-text-secondary)]">
                No technicians registered
              </p>
              <button
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add first technician
              </button>
            </div>
          ) : (
            <div className="-mx-4 mt-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--dash-border-table)] text-left text-[var(--dash-text-muted)]">
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">
                      Technician
                    </th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Phone</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Color</th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--dash-border-table)]">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-10 w-10" textClassName="text-xs" />
                          <div className="font-bold text-[var(--dash-text)]">{t.name}</div>
                        </div>
                      </td>
                      <td className="py-4 text-[var(--dash-text)]">
                        {t.phone ? formatPhone(t.phone) : "—"}
                      </td>
                      <td className="py-4">
                        <span
                          className="inline-block h-4 w-4 rounded-full"
                          style={{ background: t.color }}
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditing(t)}
                            title="Edit"
                            className="hover:opacity-70"
                            style={{ color: "var(--dash-navy)" }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeactivating(t)}
                            title="Remove"
                            className="hover:opacity-70"
                            style={{ color: "var(--dash-red)" }}
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <TechnicianFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["technicians"] })}
      />
      <TechnicianFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["technicians"] })}
      />

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Remove technician"
        maxWidth="max-w-md"
      >
        {deactivating && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--dash-text-secondary)]">
              Are you sure you want to remove <b>{deactivating.name}</b>? They will no longer show
              up when assigning routes, but their existing route history is kept.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeactivating(null)}
                className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]"
              >
                Cancel
              </button>
              <button
                disabled={deactivateMut.isPending}
                onClick={() => deactivateMut.mutate(deactivating.id)}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--dash-red)" }}
              >
                {deactivateMut.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TechnicianFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Technician | null;
}) {
  const empty = { name: "", phone: "", color: COLORS[0], photo_path: null as string | null };
  const [form, setForm] = useState(empty);

  const editingId = editing?.id ?? null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && editingId !== loadedId) {
    setForm(
      editing
        ? { name: editing.name, phone: editing.phone || "", color: editing.color, photo_path: editing.photo_path ?? null }
        : empty,
    );
    setLoadedId(editingId);
  }
  useEffect(() => {
    if (!open) setLoadedId(null);
  }, [open]);

  const mut = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editing) {
        await updateTechnician(editing.id, values);
      } else {
        await createTechnician(values);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Technician updated!" : "Technician added!");
      setForm(empty);
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Technician" : "New Technician"}
      maxWidth="max-w-md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">
            Name *
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">
            Phone
          </label>
          <input
            value={formatPhone(form.phone)}
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">
            Color
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className="h-8 w-8 rounded-full ring-offset-2 transition"
                style={{
                  background: c,
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined,
                }}
              />
            ))}
          </div>
        </div>
        {editing && (
          <PhotoUploader
            label="Photo"
            value={form.photo_path ? [form.photo_path] : []}
            onChange={(v) => setForm({ ...form, photo_path: v[0] ?? null })}
            folder={`technicians/${editing.id}`}
            max={1}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[var(--dash-border)] px-4 py-2 text-sm font-semibold text-[var(--dash-text-secondary)]"
          >
            Cancel
          </button>
          <button
            disabled={mut.isPending}
            className="rounded-[10px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mut.isPending ? "Saving..." : editing ? "Update Technician" : "Save Technician"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
