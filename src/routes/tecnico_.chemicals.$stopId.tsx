import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Droplet, FlaskConical, Diamond, ShieldCheck, Minus, Plus, Filter,
  CheckCircle2, AlertTriangle, Check, ChevronRight, StickyNote, History, X, Waves, Droplets, CalendarDays,
  ChevronDown, Square, Gem,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyTechnician, getMyStopDetail, getMyStopChemicals, saveMyStopChemicals, updateMyStopStatus,
  getMyStopChemicalsHistory, logMyStopFilterCleaning, fmtDate, formatProductQty, mergeSavedProducts,
  CHEMICAL_READING_META, DEFAULT_READINGS, DEFAULT_PRODUCTS, isReadingInRange,
  type ChemicalReadingKey, type ChemicalReadings, type Product, type BodyType,
} from "@/lib/db";
import iconLiquidChlorine from "@/assets/products/liquid-chlorine.png";
import iconChlorineTabs from "@/assets/products/chlorine-tabs.png";
import iconMuriaticAcid from "@/assets/products/muriatic-acid.png";
import iconBakingSoda from "@/assets/products/baking-soda.png";
import iconCalcium from "@/assets/products/calcium.png";
import iconStabilizer from "@/assets/products/stabilizer.png";
import iconSaltBag from "@/assets/products/salt-bag.png";

const PRODUCT_ICONS: Record<string, string> = {
  "Liquid Chlorine": iconLiquidChlorine,
  "Chlorine Tabs": iconChlorineTabs,
  "Muriatic Acid": iconMuriaticAcid,
  "Baking Soda": iconBakingSoda,
  "Calcium": iconCalcium,
  "Stabilizer": iconStabilizer,
  "Salt Bag": iconSaltBag,
};

const PRODUCT_SHORT_NAMES: Record<string, string> = {
  "Liquid Chlorine": "Chlorine",
  "Chlorine Tabs": "Tabs",
  "Muriatic Acid": "Acid",
};

export const Route = createFileRoute("/tecnico_/chemicals/$stopId")({
  component: TechnicianChemicalsPage,
});

const READING_ICONS: Record<ChemicalReadingKey, { icon: typeof Droplet; gradient: string }> = {
  free_chlorine: { icon: Droplet, gradient: "linear-gradient(135deg, #4FADF7 0%, #0B63E8 100%)" },
  ph: { icon: FlaskConical, gradient: "linear-gradient(135deg, #A66BEE 0%, #7C3AED 100%)" },
  total_alkalinity: { icon: FlaskConical, gradient: "linear-gradient(135deg, #7FC97F 0%, #3C8D40 100%)" },
  calcium_hardness: { icon: Diamond, gradient: "linear-gradient(135deg, #FBB03B 0%, #F2711C 100%)" },
  stabilizer: { icon: ShieldCheck, gradient: "linear-gradient(135deg, #4FADF7 0%, #0B63E8 100%)" },
  salt: { icon: Gem, gradient: "linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)" },
};

const READING_FLAT_COLORS: Record<ChemicalReadingKey, { icon: typeof Droplet; bg: string; fg: string }> = {
  free_chlorine: { icon: Droplet, bg: "#DBEAFE", fg: "#0B63E8" },
  ph: { icon: FlaskConical, bg: "#EDE4FB", fg: "#7C3AED" },
  total_alkalinity: { icon: FlaskConical, bg: "#DCFCE7", fg: "#3C8D40" },
  calcium_hardness: { icon: Diamond, bg: "#FFEDD5", fg: "#F2711C" },
  stabilizer: { icon: ShieldCheck, bg: "#DBEAFE", fg: "#0B63E8" },
  salt: { icon: Gem, bg: "#CCFBF1", fg: "#0D9488" },
};

function formatCleanedAt(iso: string | null | undefined) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const READING_ORDER: ChemicalReadingKey[] = ["free_chlorine", "ph", "total_alkalinity", "calcium_hardness", "stabilizer", "salt"];

const STATUS_LABEL: Record<string, string> = { "Pendente": "Pendente", "Em serviço": "Em andamento", "Concluído": "Concluído" };

function decimals(step: number) {
  return step < 1 ? 1 : 0;
}

function TechnicianChemicalsPage() {
  const { stopId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      const technician = await getMyTechnician();
      if (!technician) { navigate({ to: "/invoice" }); return; }
      setCheckedSession(true);
    })();
  }, [navigate]);

  const { data: stop } = useQuery({ queryKey: ["my-stop-detail", stopId], queryFn: () => getMyStopDetail(stopId), enabled: checkedSession });
  const [bodyType, setBodyType] = useState<BodyType>("pool");
  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-stop-chemicals", stopId, bodyType],
    queryFn: () => getMyStopChemicals(stopId, bodyType),
    enabled: checkedSession,
  });

  const [readings, setReadings] = useState<ChemicalReadings>(DEFAULT_READINGS);
  const [readingDrafts, setReadingDrafts] = useState<Partial<Record<ChemicalReadingKey, string>>>({});
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [notes, setNotes] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<"chemicals" | "products">("chemicals");
  const [historyBodyType, setHistoryBodyType] = useState<BodyType>("pool");
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(new Set());
  function toggleEntryCollapsed(id: string) {
    setCollapsedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["my-stop-chemicals-history", stopId],
    queryFn: () => getMyStopChemicalsHistory(stopId),
    enabled: historyOpen,
  });
  const historyForBody = (history ?? []).filter((h) => h.chemicals.body_type === historyBodyType);

  useEffect(() => {
    if (!checkedSession || isLoading || loadedKey === bodyType) return;
    if (existing) {
      setReadings({
        free_chlorine: existing.free_chlorine ?? DEFAULT_READINGS.free_chlorine,
        ph: existing.ph ?? DEFAULT_READINGS.ph,
        total_alkalinity: existing.total_alkalinity ?? DEFAULT_READINGS.total_alkalinity,
        calcium_hardness: existing.calcium_hardness ?? DEFAULT_READINGS.calcium_hardness,
        stabilizer: existing.stabilizer ?? DEFAULT_READINGS.stabilizer,
        salt: existing.salt ?? DEFAULT_READINGS.salt,
      });
      setProducts(existing.products.length > 0 ? mergeSavedProducts(existing.products) : DEFAULT_PRODUCTS);
      setNotes(existing.notes ?? "");
    } else {
      setReadings(DEFAULT_READINGS);
      setProducts(DEFAULT_PRODUCTS);
      setNotes("");
    }
    setLoadedKey(bodyType);
  }, [checkedSession, existing, isLoading, loadedKey, bodyType]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await saveMyStopChemicals(stopId, { readings, products, notes }, bodyType);
      await updateMyStopStatus(stopId, "Concluído");
    },
    onSuccess: () => {
      toast.success("Químicos salvos e parada concluída!");
      qc.invalidateQueries({ queryKey: ["my-technician-stops"] });
      navigate({ to: "/tecnico", search: { view: "rota" } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filterCleanMut = useMutation({
    mutationFn: () => logMyStopFilterCleaning(stopId),
    onSuccess: () => {
      toast.success("Limpeza do filtro registrada!");
      qc.invalidateQueries({ queryKey: ["my-stop-detail", stopId] });
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

  function handleReadingInput(key: ChemicalReadingKey, raw: string) {
    setReadingDrafts((d) => ({ ...d, [key]: raw }));
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    const meta = CHEMICAL_READING_META[key];
    const factor = 10 ** decimals(meta.step);
    const clamped = Math.max(0, parsed);
    setReadings((r) => ({ ...r, [key]: Math.round(clamped * factor) / factor }));
  }

  function handleReadingBlur(key: ChemicalReadingKey) {
    setReadingDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  function adjustProduct(name: string, dir: 1 | -1) {
    setProducts((list) => list.map((p) => (p.name === name ? { ...p, qty: Math.max(0, Math.round((p.qty + dir * (p.step ?? 1)) * 100) / 100) } : p)));
  }

  function addProduct() {
    if (!newProductName.trim()) return;
    setProducts((list) => [...list, { name: newProductName.trim(), unit: newProductUnit.trim() || "unit", qty: 0 }]);
    setNewProductName(""); setNewProductUnit(""); setAddProductOpen(false);
  }

  if (!checkedSession) return null;

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-28">
      <header className="relative flex items-center justify-center border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-4">
        <button onClick={() => navigate({ to: "/tecnico", search: { view: "rota" } })} className="absolute left-4 text-[var(--dash-text-secondary)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-[var(--dash-text)]">{bodyType === "spa" ? "Químicos do Spa" : "Químicos da Piscina"}</h1>
          <p className="text-[12px] text-[var(--dash-text-muted-2)]">Adicione leituras e produtos usados</p>
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
                <div className="text-[15px] font-extrabold">{stop.client_name}</div>
                <div className="text-[13px] text-white/80">{stop.client_address}</div>
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

        {stop?.has_spa && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--dash-border)] bg-white p-1.5">
            {(["pool", "spa"] as BodyType[]).map((bt) => (
              <button
                key={bt}
                onClick={() => setBodyType(bt)}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold capitalize"
                style={{
                  background: bodyType === bt ? "var(--dash-navy)" : "transparent",
                  color: bodyType === bt ? "#fff" : "var(--dash-text-secondary)",
                }}
              >
                {bt === "pool" ? <Waves className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                {bt === "pool" ? "Pool" : "Spa"}
              </button>
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Leituras Químicas</h2>
            <button
              onClick={() => { setHistoryMode("chemicals"); setHistoryBodyType(bodyType); setHistoryOpen(true); }}
              className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
            >
              <History className="h-3.5 w-3.5" /> Histórico
            </button>
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
                    <div className="text-[12.6px] font-bold text-[var(--dash-text)]">
                      {meta.label} {meta.unit && <span className="font-normal text-[var(--dash-text-muted-2)]">({meta.unit})</span>}
                    </div>
                    <div className="text-[10.8px] text-[var(--dash-text-muted-2)]">Ideal: {meta.min} – {meta.max}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => adjustReading(key, -1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={meta.step}
                      min={0}
                      value={readingDrafts[key] ?? value}
                      onChange={(e) => handleReadingInput(key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => handleReadingBlur(key)}
                      className="w-11 shrink-0 bg-transparent text-center text-[16px] font-extrabold text-[var(--dash-text)] outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
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
                  <div className="text-[14px] font-bold text-[var(--dash-text)]">Limpeza do Filtro</div>
                  <div className="text-[12px] text-[var(--dash-text-muted-2)]">filter maintenance</div>
                </div>
              </div>
              <button
                onClick={() => filterCleanMut.mutate()}
                disabled={filterCleanMut.isPending}
                className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
                style={{ background: "#2563EB" }}
              >
                <Check className="h-3.5 w-3.5" /> Filtro Limpo
              </button>
            </div>
            <div className="mt-2 overflow-x-auto whitespace-nowrap px-1 text-center text-[13.2px] text-[var(--dash-text-muted-2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              Last cleaned: <span className="font-bold text-[var(--dash-text)]">{formatCleanedAt(stop?.filter_last_cleaned_at)}</span>
              {daysSince(stop?.filter_last_cleaned_at) !== null && (
                <> · {daysSince(stop?.filter_last_cleaned_at) === 0 ? "today" : `${daysSince(stop?.filter_last_cleaned_at)} day${daysSince(stop?.filter_last_cleaned_at) === 1 ? "" : "s"} ago`}</>
              )}
              {" · "}{stop?.filter_cleaning_count ?? 0} {(stop?.filter_cleaning_count ?? 0) === 1 ? "cleaning" : "cleanings"}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--dash-water-bg)] text-[var(--dash-water-icon)]">
                <FlaskConical className="h-4 w-4" />
              </div>
              <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Produtos</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setHistoryMode("products"); setHistoryBodyType(bodyType); setHistoryOpen(true); }}
                className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
              >
                <History className="h-3.5 w-3.5" /> Histórico
              </button>
              <button
                onClick={() => setAddProductOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-[var(--dash-water-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--dash-water-icon)]"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          </div>

          {addProductOpen && (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-[var(--dash-bg)] p-3">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Nome do produto</label>
                <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
              </div>
              <div className="w-24">
                <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Unidade</label>
                <input value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value)} placeholder="gal" className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
              </div>
              <button onClick={addProduct} className="rounded-[10px] bg-[var(--dash-navy)] px-3 py-2 text-sm font-semibold text-white">Adicionar</button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {products.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-1 rounded-xl border border-[var(--dash-border)] p-2 text-center">
                {PRODUCT_ICONS[p.name] && (
                  <img src={PRODUCT_ICONS[p.name]} alt="" className="h-12 w-auto shrink-0 object-contain" />
                )}
                <div className="min-w-0 w-full">
                  <div className="truncate text-[14px] font-bold text-[var(--dash-text)]">
                    {PRODUCT_SHORT_NAMES[p.name] ?? p.name} {p.unit && <span className="font-normal text-[var(--dash-text-muted-2)]">({p.unit})</span>}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-0.5">
                    <button onClick={() => adjustProduct(p.name, -1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xl font-extrabold text-[var(--dash-text)]">{formatProductQty(p.qty)}</span>
                    <button onClick={() => adjustProduct(p.name, 1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
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
            <h2 className="text-[15px] font-extrabold text-[var(--dash-text)]">Notas</h2>
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicionar notas do serviço..."
            className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm"
          />
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--dash-border)] bg-[var(--dash-surface)] p-3">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button
            onClick={() => navigate({ to: "/tecnico", search: { view: "rota" } })}
            className="flex-1 rounded-[12px] border border-[var(--dash-border)] py-3 text-sm font-bold text-[var(--dash-text-secondary)]"
          >
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--dash-green)" }}
          >
            <Check className="h-4 w-4" /> {saveMut.isPending ? "Salvando..." : "Salvar e Concluir"}
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
              <h2 className="text-xl font-extrabold text-[var(--dash-text)]">
                {historyMode === "chemicals" ? "Histórico de Químicos" : "Histórico de Produtos"}
              </h2>
              <button onClick={() => setHistoryOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--dash-bg)] text-[var(--dash-text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {stop?.has_spa && (
              <div className="flex gap-2 p-4 pb-0">
                {(["pool", "spa"] as BodyType[]).map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setHistoryBodyType(bt)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-sm font-bold capitalize"
                    style={{
                      background: historyBodyType === bt ? "#0B63F6" : "#fff",
                      color: historyBodyType === bt ? "#fff" : "#0B63F6",
                      borderColor: historyBodyType === bt ? "transparent" : "#0B63F6",
                    }}
                  >
                    {bt === "pool" ? <Waves className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                    {bt === "pool" ? "Pool" : "Spa"}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <p className="py-8 text-center text-sm text-[var(--dash-text-muted-2)]">Carregando...</p>
              ) : historyForBody.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--dash-text-muted-2)]">
                  {historyMode === "chemicals" ? "Nenhuma leitura anterior para este cliente ainda." : "Nenhum produto registrado para este cliente ainda."}
                </p>
              ) : historyMode === "chemicals" ? (
                historyForBody.map((entry) => {
                  const expanded = !collapsedEntries.has(entry.chemicals.id);
                  return (
                    <div key={entry.chemicals.id} className="rounded-xl border border-[var(--dash-border)] p-3">
                      <button
                        type="button"
                        onClick={() => toggleEntryCollapsed(entry.chemicals.id)}
                        className="flex w-full items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-[#0B63F6]">
                            <CalendarDays className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[14px] font-extrabold text-[var(--dash-text)]">{fmtDate(entry.route_date)}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--dash-text-muted-2)] transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </button>
                      {expanded && (
                        <>
                          <div className="mt-2 divide-y divide-[var(--dash-border-table)]">
                            {READING_ORDER.map((key) => {
                              const meta = CHEMICAL_READING_META[key];
                              const value = entry.chemicals[key];
                              if (value === null) return null;
                              const { icon: Icon, bg, fg } = READING_FLAT_COLORS[key];
                              return (
                                <div key={key} className="flex items-center justify-between gap-2 py-1.5">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: bg, color: fg }}>
                                      <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="truncate text-[13px] text-[var(--dash-text-secondary)]">{meta.label}</span>
                                  </div>
                                  <span className="shrink-0 text-[15px] font-extrabold text-[var(--dash-text)]">{value.toFixed(decimals(meta.step))}</span>
                                </div>
                              );
                            })}
                          </div>
                          {entry.chemicals.notes && (
                            <div className="mt-2 text-[12px] text-[var(--dash-text-muted-2)]">{entry.chemicals.notes}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                historyForBody.map((entry) => {
                  const usedProducts = entry.chemicals.products.filter((p) => p.qty > 0);
                  const expanded = !collapsedEntries.has(entry.chemicals.id);
                  return (
                    <div key={entry.chemicals.id} className="rounded-xl border border-[var(--dash-border)] p-3">
                      <button
                        type="button"
                        onClick={() => toggleEntryCollapsed(entry.chemicals.id)}
                        className="flex w-full items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-[#0B63F6]">
                            <CalendarDays className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[14px] font-extrabold text-[var(--dash-text)]">{fmtDate(entry.route_date)}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--dash-text-muted-2)] transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </button>
                      {expanded && (
                        usedProducts.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {usedProducts.map((p) => (
                              <div key={p.name} className="flex items-center gap-2.5 rounded-xl bg-[var(--dash-bg)] px-3 py-2.5">
                                {PRODUCT_ICONS[p.name] ? (
                                  <img src={PRODUCT_ICONS[p.name]} alt="" className="h-6 w-6 shrink-0 object-contain" />
                                ) : (
                                  <div className="h-6 w-6 shrink-0 rounded-full border border-[var(--dash-border)]" />
                                )}
                                <span className="text-[13px] text-[var(--dash-text-secondary)]">
                                  <span className="font-semibold text-[var(--dash-text)]">{p.name}:</span> {formatProductQty(p.qty)} {p.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2.5 text-[13px] text-[var(--dash-text-muted-2)]">
                            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--dash-border)]">
                              <Square className="h-3 w-3" />
                            </div>
                            Nenhum produto usado nesta visita.
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
