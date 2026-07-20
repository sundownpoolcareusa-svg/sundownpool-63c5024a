import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Droplet, FlaskConical, Diamond, ShieldCheck, Minus, Plus, Filter,
  CheckCircle2, AlertTriangle, History, Info, Camera, Check, ChevronRight, StickyNote, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getRouteStop, getStopChemicals, saveStopChemicals, updateStopStatus, getClientChemicalsHistory, fmtDate,
  logFilterCleaning,
  CHEMICAL_READING_META, DEFAULT_READINGS, DEFAULT_PRODUCTS, isReadingInRange,
  type ChemicalReadingKey, type ChemicalReadings, type Product,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/chemicals/$stopId")({
  component: PoolChemicalsPage,
});

const READING_ICONS: Record<ChemicalReadingKey, { icon: typeof Droplet; gradient: string }> = {
  free_chlorine: { icon: Droplet, gradient: "linear-gradient(135deg, #4FADF7 0%, #0B63E8 100%)" },
  ph: { icon: FlaskConical, gradient: "linear-gradient(135deg, #A66BEE 0%, #7C3AED 100%)" },
  total_alkalinity: { icon: FlaskConical, gradient: "linear-gradient(135deg, #7FC97F 0%, #3C8D40 100%)" },
  calcium_hardness: { icon: Diamond, gradient: "linear-gradient(135deg, #FBB03B 0%, #F2711C 100%)" },
  stabilizer: { icon: ShieldCheck, gradient: "linear-gradient(135deg, #4FADF7 0%, #0B63E8 100%)" },
};

function formatCleanedAt(iso: string | null | undefined) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Calendar-day difference, not exact 24h elapsed — cleaned today counts as
// 0, the next calendar day counts as 1 regardless of what time it is now.
function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const cleanedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((todayDate.getTime() - cleanedDate.getTime()) / 86400000));
}

const READING_ORDER: ChemicalReadingKey[] = ["free_chlorine", "ph", "total_alkalinity", "calcium_hardness", "stabilizer"];

const STATUS_LABEL: Record<string, string> = { "Pendente": "Pending", "Em serviço": "In Service", "Concluído": "Completed" };

function decimals(step: number) {
  return step < 1 ? 1 : 0;
}

function PoolChemicalsPage() {
  const { stopId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const { data: stop } = useQuery({ queryKey: ["route-stop", stopId], queryFn: () => getRouteStop(stopId) });
  const { data: existing, isLoading } = useQuery({ queryKey: ["stop-chemicals", stopId], queryFn: () => getStopChemicals(stopId) });

  const [readings, setReadings] = useState<ChemicalReadings>(DEFAULT_READINGS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["client-chemicals-history", stop?.client_id, stopId],
    queryFn: () => getClientChemicalsHistory(stop!.client_id, stopId),
    enabled: historyOpen && !!stop,
  });

  useEffect(() => {
    if (isLoading || loaded) return;
    if (existing) {
      setReadings({
        free_chlorine: existing.free_chlorine ?? DEFAULT_READINGS.free_chlorine,
        ph: existing.ph ?? DEFAULT_READINGS.ph,
        total_alkalinity: existing.total_alkalinity ?? DEFAULT_READINGS.total_alkalinity,
        calcium_hardness: existing.calcium_hardness ?? DEFAULT_READINGS.calcium_hardness,
        stabilizer: existing.stabilizer ?? DEFAULT_READINGS.stabilizer,
      });
      setProducts(existing.products.length > 0 ? existing.products : DEFAULT_PRODUCTS);
      setNotes(existing.notes ?? "");
    }
    setLoaded(true);
  }, [existing, isLoading, loaded]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await saveStopChemicals(stopId, { readings, products, notes });
      if (stop) await updateStopStatus(stopId, "Concluído", stop.client_id);
    },
    onSuccess: () => {
      toast.success("Chemicals saved and stop completed!");
      qc.invalidateQueries({ queryKey: ["routes-for-date"] });
      qc.invalidateQueries({ queryKey: ["route-stops"] });
      navigate({ to: "/rotas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filterCleanMut = useMutation({
    mutationFn: () => logFilterCleaning(stop!.client_id),
    onSuccess: () => {
      toast.success("Filter cleaning logged!");
      qc.invalidateQueries({ queryKey: ["route-stop", stopId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function adjustReading(key: ChemicalReadingKey, dir: 1 | -1) {
    const meta = CHEMICAL_READING_META[key];
    setReadings((r) => {
      const raw = r[key] + dir * meta.step;
      const clamped = Math.max(0, raw);
      const factor = 10 ** decimals(meta.step);
      return { ...r, [key]: Math.round(clamped * factor) / factor };
    });
  }

  function adjustProduct(name: string, dir: 1 | -1) {
    setProducts((list) => list.map((p) => (p.name === name ? { ...p, qty: Math.max(0, Math.round((p.qty + dir * 1) * 10) / 10) } : p)));
  }

  function addProduct() {
    if (!newProductName.trim()) return;
    setProducts((list) => [...list, { name: newProductName.trim(), unit: newProductUnit.trim() || "unit", qty: 0 }]);
    setNewProductName(""); setNewProductUnit(""); setAddProductOpen(false);
  }

  const initials = (email[0] || "A").toUpperCase();

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-28">
      <header className="relative flex items-center justify-center border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-4">
        <button onClick={() => navigate({ to: "/rotas" })} className="absolute left-4 text-[var(--dash-text-secondary)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Pool Chemicals</h1>
          <p className="text-[12px] text-[var(--dash-text-muted-2)]">Add chemical readings and products used</p>
        </div>
        <div className="absolute right-4 grid h-9 w-9 place-items-center rounded-[10px] text-[13px] font-bold text-white" style={{ background: "var(--dash-navy)" }}>
          {initials}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {stop && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl p-4 text-white"
            style={{ background: "linear-gradient(135deg, var(--dash-navy) 0%, var(--dash-navy-2) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold">{stop.position + 1}</div>
              <div>
                <div className="text-[15px] font-extrabold">{stop.client?.name}</div>
                <div className="text-[13px] text-white/80">{stop.client?.address}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold">
                {STATUS_LABEL[stop.status] ?? stop.status}
              </span>
              <ChevronRight className="h-4 w-4 text-white/70" />
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Chemistry Readings</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
              >
                <History className="h-3.5 w-3.5" /> History
              </button>
              <button className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]">
                <Info className="h-3.5 w-3.5" /> Ideal Ranges
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--dash-border-table)]">
            {READING_ORDER.map((key) => {
              const meta = CHEMICAL_READING_META[key];
              const { icon: Icon, gradient } = READING_ICONS[key];
              const value = readings[key];
              const inRange = isReadingInRange(key, value);
              return (
                <div key={key} className="flex items-center gap-1 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full shadow-sm" style={{ background: gradient }}>
                    <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.4} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[var(--dash-text)]">
                      {meta.label} {meta.unit && <span className="font-normal text-[var(--dash-text-muted-2)]">({meta.unit})</span>}
                    </div>
                    <div className="text-[12px] text-[var(--dash-text-muted-2)]">Ideal: {meta.min} – {meta.max}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => adjustReading(key, -1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="w-9 shrink-0 text-center text-xl font-extrabold text-[var(--dash-text)]">
                      {value.toFixed(decimals(meta.step))}
                    </div>
                    <button onClick={() => adjustReading(key, 1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {inRange ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "var(--dash-green)" }} />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "var(--dash-orange)" }} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 border-t border-[var(--dash-border)] pt-3">
            <div className="flex items-center justify-between gap-1.5 rounded-xl p-2.5" style={{ background: "#EDF5FE" }}>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl" style={{ background: "#DCEEFC", color: "#2563EB" }}>
                  <Filter className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[var(--dash-text)]">Filter Cleaning</div>
                  <div className="text-[12px] text-[var(--dash-text-muted-2)]">Keep track of your filter maintenance</div>
                </div>
              </div>
              <button
                onClick={() => filterCleanMut.mutate()}
                disabled={filterCleanMut.isPending}
                className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
                style={{ background: "#2563EB" }}
              >
                <Check className="h-3.5 w-3.5" /> Filter Cleaned
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[12px] text-[var(--dash-text-muted-2)]">
              <span>Last cleaned: <span className="font-bold text-[var(--dash-text)]">{formatCleanedAt(stop?.client?.filter_last_cleaned_at)}</span></span>
              {daysSince(stop?.client?.filter_last_cleaned_at) !== null && (
                <>
                  <span className="text-[var(--dash-border)]">|</span>
                  <span>{daysSince(stop?.client?.filter_last_cleaned_at)} days</span>
                </>
              )}
              <span className="text-[var(--dash-border)]">|</span>
              <span># Cleaning: <span className="font-bold text-[var(--dash-text)]">{stop?.client?.filter_cleaning_count ?? 0}</span></span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
                <FlaskConical className="h-4 w-4" />
              </div>
              <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Products Added</h2>
            </div>
            <button
              onClick={() => setAddProductOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Product
            </button>
          </div>

          {addProductOpen && (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-[var(--dash-bg)] p-3">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Product name</label>
                <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
              </div>
              <div className="w-24">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Unit</label>
                <input value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value)} placeholder="gal" className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
              </div>
              <button onClick={addProduct} className="rounded-[10px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white">Add</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <div key={p.name} className="rounded-xl border border-[var(--dash-border)] p-3">
                <div className="text-[13px] font-bold text-[var(--dash-text)]">{p.name}</div>
                <div className="text-[11px] text-[var(--dash-text-muted-2)]">{p.unit}</div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button onClick={() => adjustProduct(p.name, -1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[15px] font-extrabold text-[var(--dash-text)]">{p.qty.toFixed(1).replace(/\.0$/, "")}</span>
                  <button onClick={() => adjustProduct(p.name, 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
              <StickyNote className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Notes</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add service notes..."
              className="flex-1 rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => toast.info("Photo attachments — coming soon")}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[var(--dash-border)] text-[var(--dash-text-secondary)]"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--dash-border)] bg-[var(--dash-surface)] p-3">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button
            onClick={() => navigate({ to: "/rotas" })}
            className="flex-1 rounded-[12px] border border-[var(--dash-border)] py-3 text-sm font-bold text-[var(--dash-text-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--dash-green)" }}
          >
            <Check className="h-4 w-4" /> {saveMut.isPending ? "Saving..." : "Save & Complete"}
          </button>
        </div>
      </footer>

      {historyOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setHistoryOpen(false)}>
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--dash-border)] p-4">
              <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Chemistry History</h2>
              <button onClick={() => setHistoryOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-[var(--dash-text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <p className="py-8 text-center text-sm text-[var(--dash-text-muted-2)]">Loading...</p>
              ) : !history || history.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--dash-text-muted-2)]">No previous readings for this client yet.</p>
              ) : (
                history.map((entry) => (
                  <div key={entry.route_stop_id} className="rounded-xl border border-[var(--dash-border)] p-3">
                    <div className="text-[13px] font-extrabold text-[var(--dash-text)]">{fmtDate(entry.route_date)}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {READING_ORDER.map((key) => {
                        const meta = CHEMICAL_READING_META[key];
                        const value = entry.chemicals[key];
                        if (value === null) return null;
                        return (
                          <div key={key} className="text-[12px]">
                            <span className="text-[var(--dash-text-muted-2)]">{meta.label}: </span>
                            <span className="font-bold text-[var(--dash-text)]">{value.toFixed(decimals(meta.step))}</span>
                          </div>
                        );
                      })}
                    </div>
                    {entry.chemicals.products.some((p) => p.qty > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.chemicals.products.filter((p) => p.qty > 0).map((p) => (
                          <span key={p.name} className="rounded-full bg-[var(--dash-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--dash-text-secondary)]">
                            {p.name}: {p.qty} {p.unit}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.chemicals.notes && (
                      <div className="mt-2 text-[12px] text-[var(--dash-text-muted-2)]">{entry.chemicals.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
