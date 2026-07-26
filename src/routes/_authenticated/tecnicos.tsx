import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import { TechAvatar } from "@/components/TechAvatar";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Plus, Pencil, UserX, HardHat, Crown, KeyRound, ChevronDown } from "lucide-react";
import {
  listTechniciansAdmin,
  createTechnician,
  updateTechnician,
  deactivateTechnician,
  createTechnicianLogin,
  resetTechnicianPassword,
  type TechnicianAdmin,
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
  const [editing, setEditing] = useState<TechnicianAdmin | null>(null);
  const [deactivating, setDeactivating] = useState<TechnicianAdmin | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians-admin"],
    queryFn: listTechniciansAdmin,
  });
  const master = technicians.filter((t) => t.is_owner);
  const staff = technicians.filter((t) => !t.is_owner);

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateTechnician(id),
    onSuccess: () => {
      toast.success("User removed");
      qc.invalidateQueries({ queryKey: ["technicians-admin"] });
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
              Users
            </h1>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-[11px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New User
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : technicians.length === 0 ? (
            <div className="mt-8 rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-16 text-center">
              <HardHat className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
              <p className="mt-3 font-semibold text-[var(--dash-text-secondary)]">
                No users registered
              </p>
              <button
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add first user
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {master.map((t) => (
                <UserCard key={t.id} t={t} onEdit={() => setEditing(t)} onRemove={() => setDeactivating(t)} />
              ))}

              {staff.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setStaffOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[var(--dash-border)] bg-white px-4 py-3"
                  >
                    <span className="text-sm font-bold text-[var(--dash-text)]">Users ({staff.length})</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--dash-text-muted)] transition-transform ${staffOpen ? "rotate-180" : ""}`} />
                  </button>
                  {staffOpen && (
                    <div className="mt-3 space-y-3">
                      {staff.map((t) => (
                        <UserCard key={t.id} t={t} onEdit={() => setEditing(t)} onRemove={() => setDeactivating(t)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <TechnicianFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["technicians-admin"] }); qc.invalidateQueries({ queryKey: ["technicians"] }); }}
      />
      <TechnicianFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["technicians-admin"] }); qc.invalidateQueries({ queryKey: ["technicians"] }); }}
      />

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Remove user"
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

function UserCard({ t, onEdit, onRemove }: { t: TechnicianAdmin; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--dash-border)] bg-white p-4" style={cardShadow}>
      <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-11 w-11" textClassName="text-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold text-[var(--dash-text)]">{t.name}</span>
          {t.is_owner && <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-orange)" }} />}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--dash-text-muted-2)]">
          {t.auth_email ?? <span className="text-[var(--dash-text-muted)]">No login yet</span>}
        </div>
        {t.phone && <div className="mt-0.5 text-[12px] text-[var(--dash-text-muted-2)]">{formatPhone(t.phone)}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--dash-bg)]"
          style={{ color: "var(--dash-navy)" }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--dash-bg)]"
          style={{ color: "var(--dash-red)" }}
        >
          <UserX className="h-4 w-4" />
        </button>
      </div>
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
  editing?: TechnicianAdmin | null;
}) {
  const empty = {
    name: "", phone: "", color: COLORS[0], photo_path: null as string | null, is_owner: false,
    can_view_earnings: true, can_manage_clients: false,
  };
  const [form, setForm] = useState(empty);

  const editingId = editing?.id ?? null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && editingId !== loadedId) {
    setForm(
      editing
        ? {
          name: editing.name, phone: editing.phone || "", color: editing.color, photo_path: editing.photo_path ?? null, is_owner: editing.is_owner ?? false,
          can_view_earnings: editing.can_view_earnings ?? true, can_manage_clients: editing.can_manage_clients ?? false,
        }
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
      toast.success(editing ? "User updated!" : "User added!");
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
      title={editing ? "Edit User" : "New User"}
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
        <label className="flex items-center gap-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm text-[var(--dash-text-secondary)]">
          <input
            type="checkbox"
            checked={form.is_owner}
            onChange={(e) => setForm({ ...form, is_owner: e.target.checked })}
            className="h-4 w-4"
          />
          This is the Master (company owner)
        </label>

        {!form.is_owner && (
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">
              Permissions
            </label>
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm text-[var(--dash-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.can_view_earnings}
                  onChange={(e) => setForm({ ...form, can_view_earnings: e.target.checked })}
                  className="h-4 w-4"
                />
                Can see $ values (route totals, averages) on their own dashboard
              </label>
              <label className="flex items-center gap-2 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm text-[var(--dash-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.can_manage_clients}
                  onChange={(e) => setForm({ ...form, can_manage_clients: e.target.checked })}
                  className="h-4 w-4"
                />
                Can add/edit clients (reserved — not available in the technician app yet)
              </label>
            </div>
          </div>
        )}

        {editing && <LoginSection technician={editing} />}

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
            {mut.isPending ? "Saving..." : editing ? "Update User" : "Save User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Creating/resetting a login happens immediately (its own button, its own
// request) rather than being bundled into the main form's Save — it goes
// through a separate Edge Function call, not the plain table update the
// rest of the form uses, and success/failure for it is independent of
// whether the name/phone/permissions changes above get saved.
function LoginSection({ technician }: { technician: TechnicianAdmin }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createMut = useMutation({
    mutationFn: () => createTechnicianLogin(technician.id, email, password),
    onSuccess: () => {
      toast.success("Login created!");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["technicians-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: () => resetTechnicianPassword(technician.id, password),
    onSuccess: () => {
      toast.success("Password updated!");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-[10px] border border-[var(--dash-border-input)] p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">
        <KeyRound className="h-3.5 w-3.5" /> Login
      </div>
      {technician.auth_user_id ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-[var(--dash-text-secondary)]">{technician.auth_email}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!password || resetMut.isPending}
            onClick={() => resetMut.mutate()}
            className="rounded-[10px] border border-[var(--dash-border)] px-3 py-2 text-sm font-semibold text-[var(--dash-text-secondary)] disabled:opacity-50"
          >
            {resetMut.isPending ? "Saving..." : "Reset Password"}
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!email || !password || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="rounded-[10px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {createMut.isPending ? "Creating..." : "Create Login"}
          </button>
        </div>
      )}
    </div>
  );
}
