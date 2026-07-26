import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Modal } from "@/components/Modal";
import { TechAvatar } from "@/components/TechAvatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, UserX, HardHat, Crown, ChevronDown, Search, Camera, Loader2, Check,
  Users, Contact, Route as RouteIcon, FileText, Receipt, BarChart3, Wrench,
} from "lucide-react";
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
  const [search, setSearch] = useState("");
  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians-admin"],
    queryFn: listTechniciansAdmin,
  });
  // The Master's own login (whoever is signed in) is shown here even when
  // they have no active technician record of their own — e.g. right after
  // removing their own "does field routes too" record, "who's the Master"
  // shouldn't disappear from this screen.
  const { data: ownerEmail } = useQuery({
    queryKey: ["owner-email"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email ?? null;
    },
  });
  const q = search.trim().toLowerCase();
  const filtered = q
    ? technicians.filter((t) => [t.name, t.auth_email, t.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q)))
    : technicians;
  const master = filtered.filter((t) => t.is_owner);
  const staff = filtered.filter((t) => !t.is_owner);

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

          {!isLoading && !technicians.some((t) => t.is_owner) && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--dash-border)] bg-white p-4" style={cardShadow}>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: "var(--dash-navy)" }}>
                <Crown className="h-5 w-5" style={{ color: "var(--dash-orange)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-[var(--dash-text)]">Master</div>
                <div className="mt-0.5 truncate text-[12.5px] text-[var(--dash-text-muted-2)]">{ownerEmail ?? "—"}</div>
              </div>
            </div>
          )}

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
            <>
              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-full border border-[var(--dash-border)] bg-[var(--dash-bg)] py-3 pl-11 pr-4 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)]"
                />
              </div>

              {master.length === 0 && staff.length === 0 ? (
                <p className="mt-5 py-8 text-center text-sm text-[var(--dash-text-muted)]">No users match "{search}".</p>
              ) : (
                <div className="mt-4 divide-y divide-[var(--dash-border)] overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-white">
                  {master.map((t) => (
                    <UserRow
                      key={t.id}
                      t={t}
                      onEdit={() => setEditing(t)}
                      onRemove={() => setDeactivating(t)}
                      toggle={staff.length > 0 ? { open: staffOpen, onToggle: () => setStaffOpen((v) => !v) } : undefined}
                    />
                  ))}
                  {(staffOpen || master.length === 0) && staff.map((t) => (
                    <UserRow key={t.id} t={t} onEdit={() => setEditing(t)} onRemove={() => setDeactivating(t)} />
                  ))}
                </div>
              )}
            </>
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

function UserRow({
  t, onEdit, onRemove, toggle,
}: {
  t: TechnicianAdmin;
  onEdit: () => void;
  onRemove: () => void;
  toggle?: { open: boolean; onToggle: () => void };
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="relative shrink-0">
        <TechAvatar name={t.name} color={t.color} photoPath={t.photo_path} className="h-12 w-12" textClassName="text-sm" />
        {t.auth_user_id && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--dash-green)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-[var(--dash-text)]">{t.name}</span>
          {t.is_owner && <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dash-orange)" }} />}
        </div>
        {t.auth_email && (
          <div className="mt-1.5">
            <span className="truncate text-[12.5px] text-[var(--dash-text-muted-2)]">{t.auth_email}</span>
          </div>
        )}
        {t.phone && <div className="mt-1.5 text-[13px] text-[var(--dash-text-muted-2)]">{formatPhone(t.phone)}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "var(--dash-water-bg)", color: "var(--dash-navy)" }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove"
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "var(--dash-red-border)", color: "var(--dash-red)" }}
          >
            <UserX className="h-4 w-4" />
          </button>
        </div>
        {toggle && (
          <button type="button" onClick={toggle.onToggle} title="Users" className="mt-1 grid h-9 w-9 place-items-center">
            <ChevronDown className={`h-5 w-5 text-[var(--dash-text-muted)] transition-transform ${toggle.open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}

type PermissionKey =
  | "can_manage_users" | "can_manage_clients" | "can_manage_routes"
  | "can_manage_estimates" | "can_manage_invoices" | "can_view_earnings" | "can_manage_services";

const PERMISSIONS: { key: PermissionKey; label: string; icon: typeof Users }[] = [
  { key: "can_manage_users", label: "Manage Users", icon: Users },
  { key: "can_manage_clients", label: "Manage Clients", icon: Contact },
  { key: "can_manage_routes", label: "Manage Routes", icon: RouteIcon },
  { key: "can_manage_estimates", label: "Manage Estimates", icon: FileText },
  { key: "can_manage_invoices", label: "Manage Invoices", icon: Receipt },
  { key: "can_view_earnings", label: "View Reports", icon: BarChart3 },
  { key: "can_manage_services", label: "Manage Services", icon: Wrench },
];

function PermissionRow({ icon: Icon, label, checked, onToggle }: { icon: typeof Users; label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left">
      <Icon className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]" />
      <span className="flex-1 text-sm font-semibold text-[var(--dash-text)]">{label}</span>
      <span
        className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border"
        style={checked ? { background: "var(--dash-navy)", borderColor: "var(--dash-navy)" } : { borderColor: "var(--dash-border-input)" }}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </span>
    </button>
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
    can_view_earnings: true, can_manage_clients: false, can_manage_users: false,
    can_manage_routes: false, can_manage_estimates: false, can_manage_invoices: false, can_manage_services: false,
  };
  const [form, setForm] = useState(empty);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const editingId = editing?.id ?? null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && editingId !== loadedId) {
    setForm(
      editing
        ? {
          name: editing.name, phone: editing.phone || "", color: editing.color, photo_path: editing.photo_path ?? null, is_owner: editing.is_owner ?? false,
          can_view_earnings: editing.can_view_earnings ?? true, can_manage_clients: editing.can_manage_clients ?? false,
          can_manage_users: editing.can_manage_users ?? false, can_manage_routes: editing.can_manage_routes ?? false,
          can_manage_estimates: editing.can_manage_estimates ?? false, can_manage_invoices: editing.can_manage_invoices ?? false,
          can_manage_services: editing.can_manage_services ?? false,
        }
        : empty,
    );
    setLoadedId(editingId);
  }
  useEffect(() => {
    if (!open) { setLoadedId(null); setLoginOpen(false); }
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

  async function handleAvatarFile(file: File) {
    if (!editing) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `technicians/${editing.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("client-photos").upload(path, file, { upsert: false });
      if (error) throw error;
      setForm((f) => ({ ...f, photo_path: path }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit User" : "New User"}
      maxWidth="max-w-md"
      fullScreenOnMobile
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        className="space-y-5"
      >
        <div className="flex justify-center">
          <div className="relative">
            <TechAvatar name={form.name || "?"} color={form.color} photoPath={form.photo_path} className="h-24 w-24" textClassName="text-2xl" />
            {editing && (
              <label
                className="absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[var(--dash-border)] bg-white shadow"
                title="Change photo"
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--dash-text-muted)]" />
                ) : (
                  <Camera className="h-4 w-4 text-[var(--dash-text-secondary)]" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={avatarUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) handleAvatarFile(f);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[15px] font-extrabold text-[var(--dash-text)]">Personal Information</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm"
              />
            </div>
            {editing && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Email</label>
                <div className="mt-1 w-full truncate rounded-[10px] border border-[var(--dash-border-input)] bg-[var(--dash-bg)] px-3 py-2.5 text-sm text-[var(--dash-text-secondary)]">
                  {editing.auth_email ?? "No login yet"}
                </div>
              </div>
            )}
            <div>
              <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Phone</label>
              <input
                value={formatPhone(form.phone)}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Color</label>
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
          </div>
        </div>

        <div className="border-t border-[var(--dash-border)] pt-4">
          <h3 className="text-[15px] font-extrabold text-[var(--dash-text)]">Role & Status</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Role</label>
              <select
                value={form.is_owner ? "owner" : "user"}
                onChange={(e) => setForm({ ...form, is_owner: e.target.value === "owner" })}
                className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] bg-white px-3 py-2.5 text-sm"
              >
                <option value="owner">Owner (Master)</option>
                <option value="user">Tech</option>
              </select>
            </div>
            {editing && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--dash-text-secondary-2)]">Status</label>
                {form.is_owner ? (
                  <div className="mt-1 truncate rounded-[10px] border border-[var(--dash-border-input)] bg-[var(--dash-bg)] px-3 py-2.5 text-sm text-[var(--dash-text-secondary)]">
                    {editing.auth_email ?? "—"}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLoginOpen((v) => !v)}
                    className="mt-1 flex w-full items-center justify-between rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm text-[var(--dash-text-secondary)]"
                  >
                    <span className="truncate">{editing.auth_email ?? "No login yet"}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--dash-text-muted)] transition-transform ${loginOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {editing && !form.is_owner && loginOpen && <LoginSection technician={editing} />}

        {!form.is_owner && (
          <div className="border-t border-[var(--dash-border)] pt-4">
            <h3 className="text-[15px] font-extrabold text-[var(--dash-text)]">Permissions</h3>
            <div className="mt-3 divide-y divide-[var(--dash-border)] overflow-hidden rounded-[14px] border border-[var(--dash-border)]" style={cardShadow}>
              {PERMISSIONS.map((p) => (
                <PermissionRow
                  key={p.key}
                  icon={p.icon}
                  label={p.label}
                  checked={form[p.key]}
                  onToggle={() => setForm({ ...form, [p.key]: !form[p.key] })}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            disabled={mut.isPending}
            className="w-full rounded-[12px] bg-[var(--dash-navy)] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {mut.isPending ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[12px] border border-[var(--dash-border)] bg-[var(--dash-bg)] py-3 text-sm font-bold text-[var(--dash-text-secondary)]"
          >
            Cancel
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
    <div className="rounded-[14px] border border-[var(--dash-border)] bg-white p-3.5" style={cardShadow}>
      {technician.auth_user_id ? (
        <div className="space-y-2.5">
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
        <div className="space-y-2.5">
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
