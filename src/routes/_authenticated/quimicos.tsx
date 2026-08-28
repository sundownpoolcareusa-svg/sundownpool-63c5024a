import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { FlaskConical, Save, Download } from "lucide-react";
import {
  DEFAULT_PRODUCTS,
  listProductCosts,
  upsertProductCost,
  listAllChemicalsHistory,
  listTechniciansAdmin,
  formatProductQty,
  fmt,
  fmtDate,
  type ProductCost,
  type ChemicalVisitEntry,
} from "@/lib/db";
import { downloadElementAsPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quimicos")({
  component: QuimicosPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

function visitCost(entry: ChemicalVisitEntry, costByName: Map<string, number>) {
  return entry.chemicals.products.reduce(
    (sum, p) => sum + p.qty * (costByName.get(p.name) ?? 0),
    0,
  );
}

type Period = "14d" | "30d" | "thisMonth" | "lastMonth";
const PERIOD_LABELS: Record<Period, string> = {
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
};

// route_date is a plain YYYY-MM-DD string — comparing as local-midnight Dates
// avoids the timezone rollover that toISOString() based comparisons would hit.
function periodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (period) {
    case "14d":
      return { start: new Date(todayStart.getTime() - 13 * 86400000), end: endOfToday };
    case "30d":
      return { start: new Date(todayStart.getTime() - 29 * 86400000), end: endOfToday };
    case "thisMonth":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday };
    case "lastMonth":
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
  }
}

function QuimicosPage() {
  const qc = useQueryClient();
  const { data: costs = [], isLoading: loadingCosts } = useQuery({
    queryKey: ["product-costs"],
    queryFn: listProductCosts,
  });
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["all-chemicals-history"],
    queryFn: listAllChemicalsHistory,
  });
  const { data: technicians = [] } = useQuery({ queryKey: ["technicians-admin"], queryFn: listTechniciansAdmin });

  const [technicianId, setTechnicianId] = useState("all");
  const [period, setPeriod] = useState<Period>("30d");
  const { start: periodStart, end: periodEnd } = periodRange(period);
  const filteredHistory = history.filter((h) => {
    if (technicianId !== "all" && h.technician_id !== technicianId) return false;
    const d = new Date(h.route_date);
    return d >= periodStart && d <= periodEnd;
  });

  // Summed quantity per product across every filtered visit — same fraction
  // display as elsewhere (formatProductQty), grouped by name+unit since a
  // product's unit doesn't vary between visits.
  const totalsByProduct = new Map<string, { unit: string; qty: number }>();
  for (const h of filteredHistory) {
    for (const p of h.chemicals.products) {
      if (p.qty <= 0) continue;
      const key = `${p.name}|${p.unit}`;
      const existing = totalsByProduct.get(key);
      totalsByProduct.set(key, { unit: p.unit, qty: (existing?.qty ?? 0) + p.qty });
    }
  }
  const productTotals = Array.from(totalsByProduct.entries())
    .map(([key, v]) => ({ name: key.split("|")[0], unit: v.unit, qty: v.qty }))
    .sort((a, b) => b.qty - a.qty);

  const reportRef = useRef<HTMLDivElement>(null);
  const reportTechnicianLabel = technicianId === "all" ? "All Technicians" : (technicians.find((t) => t.id === technicianId)?.name ?? "");

  const costByName = new Map(costs.map((c) => [c.product_name, Number(c.cost_per_unit)]));
  const productNames = Array.from(
    new Set([...DEFAULT_PRODUCTS.map((p) => p.name), ...costs.map((c) => c.product_name)]),
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (loadingCosts) return;
    const next: Record<string, string> = {};
    for (const name of productNames) next[name] = String(costByName.get(name) ?? 0);
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingCosts, costs.length]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await Promise.all(
        productNames.map((name) => upsertProductCost(name, Number(drafts[name] || 0))),
      );
    },
    onSuccess: () => {
      toast.success("Product costs saved!");
      qc.invalidateQueries({ queryKey: ["product-costs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const thisMonth = new Date();
  const monthTotal = history
    .filter((h) => {
      const d = new Date(h.route_date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    })
    .reduce((sum, h) => sum + visitCost(h, costByName), 0);

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-20 lg:pb-0 lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="grid grid-cols-1 gap-5 p-3 sm:p-5 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <div
            className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]"
            style={cardShadow}
          >
            <div className="flex items-center justify-between border-b border-[var(--dash-border)] pb-2">
              <div className="font-bold text-[var(--dash-text)]">Product Cost per Unit</div>
              <FlaskConical className="h-4 w-4 text-[var(--dash-text-muted)]" />
            </div>
            <p className="mt-2 text-xs text-[var(--dash-text-muted)]">
              Set how much you pay per unit of each product. Used to calculate the cost of chemicals
              used on each visit.
            </p>
            {loadingCosts ? (
              <div className="py-6 text-center text-sm text-[var(--dash-text-muted)]">
                Loading...
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                {productNames.map((name) => {
                  const def = DEFAULT_PRODUCTS.find((p) => p.name === name);
                  return (
                    <div key={name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="text-[var(--dash-text-secondary)]">
                        {name}{" "}
                        {def?.unit && (
                          <span className="text-xs text-[var(--dash-text-muted)]">
                            / {def.unit}
                          </span>
                        )}
                      </div>
                      <div className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--dash-text-muted)]">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={drafts[name] ?? "0"}
                          onChange={(e) => setDrafts((d) => ({ ...d, [name]: e.target.value }))}
                          className="w-full rounded-[10px] border border-[var(--dash-border-input)] py-1.5 pl-6 pr-2 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--dash-navy)] py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving..." : "Save Costs"}
                </button>
              </div>
            )}
          </div>

          <div
            className="rounded-[18px] border border-[var(--dash-border)] bg-white p-[18px]"
            style={cardShadow}
          >
            <div className="font-bold text-[var(--dash-text)]">This Month's Chemical Cost</div>
            <div
              className="mt-2 text-2xl font-extrabold tabular-nums"
              style={{ color: "var(--dash-navy)" }}
            >
              {fmt(monthTotal)}
            </div>
          </div>
        </aside>

        <section
          className="rounded-[18px] border border-[var(--dash-border)] bg-white p-4 sm:p-6 lg:col-span-8"
          style={cardShadow}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold text-[var(--dash-text)] sm:text-2xl">
              Chemicals Applied per Visit
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="rounded-[10px] border border-[var(--dash-border-input)] bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="rounded-[10px] border border-[var(--dash-border-input)] bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>
              <button
                onClick={() => { if (reportRef.current) downloadElementAsPdf(reportRef.current, `Chemicals Report - ${reportTechnicianLabel} - ${PERIOD_LABELS[period]}`); }}
                disabled={loadingHistory || filteredHistory.length === 0}
                className="flex items-center gap-1.5 rounded-[10px] border border-[var(--dash-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] disabled:opacity-50"
              >
                <Download className="h-4 w-4" style={{ color: "var(--dash-navy)" }} /> PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pdf-print">
          {!loadingHistory && productTotals.length > 0 && (
            <div className="mt-4 rounded-[14px] border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="text-sm font-bold text-[var(--dash-text)]">
                Total products used — {PERIOD_LABELS[period]}
                {technicianId !== "all" && ` · ${technicians.find((t) => t.id === technicianId)?.name ?? ""}`}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {productTotals.map((p) => (
                  <div key={`${p.name}|${p.unit}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-[var(--dash-text-secondary)]">{p.name}</span>
                    <span className="font-bold tabular-nums text-[var(--dash-text)]">{formatProductQty(p.qty)} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="mt-8 rounded-[18px] border-2 border-dashed border-[var(--dash-border)] py-16 text-center">
              <FlaskConical className="mx-auto h-10 w-10 text-[var(--dash-text-muted)]" />
              <p className="mt-3 font-semibold text-[var(--dash-text-secondary)]">
                No chemicals logged yet
              </p>
            </div>
          ) : (
            <div className="-mx-4 mt-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--dash-border-table)] text-left text-[var(--dash-text-muted)]">
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">
                      Client
                    </th>
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Date</th>
                    {technicianId === "all" && (
                      <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">Technician</th>
                    )}
                    <th className="py-3 text-[11px] font-bold uppercase tracking-[.07em]">
                      Products Used
                    </th>
                    <th className="py-3 text-right text-[11px] font-bold uppercase tracking-[.07em]">
                      Visit Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((h) => {
                    const used = h.chemicals.products.filter((p) => p.qty > 0);
                    return (
                      <tr
                        key={h.chemicals.id}
                        className="border-b border-[var(--dash-border-table)]"
                      >
                        <td className="py-4 font-bold text-[var(--dash-text)]">
                          {h.client_name}
                          {h.chemicals.body_type === "spa" && (
                            <span className="ml-1.5 rounded-full bg-[var(--dash-water-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--dash-water-icon)]">
                              Spa
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-[var(--dash-text-secondary)]">
                          {fmtDate(h.route_date)}
                        </td>
                        {technicianId === "all" && (
                          <td className="py-4 text-[var(--dash-text-secondary)]">{h.technician_name ?? "—"}</td>
                        )}
                        <td className="py-4 text-[var(--dash-text-secondary)]">
                          {used.length === 0
                            ? "—"
                            : used
                                .map((p) => `${p.name} ${formatProductQty(p.qty)} ${p.unit}`)
                                .join(", ")}
                        </td>
                        <td className="py-4 text-right font-semibold tabular-nums text-[var(--dash-text)]">
                          {fmt(visitCost(h, costByName))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}
