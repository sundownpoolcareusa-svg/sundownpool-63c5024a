import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { getPublicEstimate } from "@/lib/public-estimate.functions";
import { DocCardHeader } from "@/components/InvoiceCard";
import { fmt, fmtDate, formatPhone } from "@/lib/db";
import { downloadElementAsPdf } from "@/lib/pdf";
import { Wrench, Download } from "lucide-react";

export const Route = createFileRoute("/e/$token")({
  component: PublicEstimatePage,
});

type PublicEstimate = {
  estimate: {
    id: string; number: string; title: string | null; estimate_date: string; valid_until: string | null;
    status: string; subtotal: number; discount: number; total: number; billing_type: string; notes: string | null;
  };
  client: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null };
  items: Array<{ name: string; description: string; qty: number; unit_price: number; total: number; position: number }>;
};

function statusLabel(s: string) {
  return { PENDENTE: "PENDING", APROVADA: "APPROVED", ENVIADA: "SENT", EXPIRADA: "EXPIRED" }[s] ?? s;
}

function PublicEstimatePage() {
  const { token } = Route.useParams();
  const fetchEstimate = useServerFn(getPublicEstimate);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-estimate", token],
    queryFn: async () => {
      const result = await fetchEstimate({ data: { token } });
      if (!result) throw new Error("Estimate not found");
      return result as PublicEstimate;
    },
  });

  const pdfRef = useRef<HTMLDivElement>(null);

  // So the browser tab (and a shared-link preview) reads something useful
  // instead of a generic app title — same reason a print-out has a name.
  useEffect(() => {
    if (data) document.title = `Estimate ${data.estimate.number} - ${data.client?.name ?? "Client"} | Sundown Pool Care`;
  }, [data]);

  if (isLoading) return <div className="dash grid min-h-screen place-items-center text-[var(--dash-text-muted)]">Loading...</div>;
  if (error || !data) return (
    <div className="dash grid min-h-screen place-items-center bg-[var(--dash-bg)] p-6">
      <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-[var(--dash-text)]">Estimate not found</h1>
        <p className="mt-2 text-sm text-[var(--dash-text-secondary)]">This link may be invalid or has been revoked.</p>
      </div>
    </div>
  );

  const { estimate, client, items } = data;
  const isApproved = estimate.status === "APROVADA";
  const sortedItems = [...(items ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div
            className="rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{
              background: isApproved ? "var(--dash-badge-paid-bg)" : "var(--dash-badge-unpaid-bg)",
              color: isApproved ? "var(--dash-badge-paid-text)" : "var(--dash-badge-unpaid-text)",
            }}
          >
            {statusLabel(estimate.status)}
          </div>
          <button
            onClick={() => { if (pdfRef.current) downloadElementAsPdf(pdfRef.current, `${client?.name || "Client"} ${estimate.number}`); }}
            className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <div ref={pdfRef} className="pdf-print rounded-[20px] border border-[var(--dash-border)] bg-white px-[26px] pb-[26px] pt-1 print:border-0 print:shadow-none" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
          <DocCardHeader title="ESTIMATE" number={estimate.number} />
          <div className="mt-1 grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 text-[var(--dash-text-secondary)]">
              <div className="font-bold text-[var(--dash-text)]">Effect Up LLC</div>
              <div>4008 Destination Dr Apt 2208</div>
              <div>Osprey, FL 34229</div>
              <div>(561) 376-2428</div>
            </div>
            <div className="space-y-1 text-right text-[var(--dash-text-secondary)]">
              <div><span className="font-semibold text-[var(--dash-text)]">Date:</span> {fmtDate(estimate.estimate_date)}</div>
              <div><span className="font-semibold text-[var(--dash-text)]">Valid Until:</span> {fmtDate(estimate.valid_until)}</div>
              <div><span className="font-semibold text-[var(--dash-text)]">Status:</span> <span className="font-bold" style={{ color: isApproved ? "var(--dash-green)" : "var(--dash-badge-unpaid-text)" }}>{statusLabel(estimate.status)}</span></div>
            </div>
          </div>
          <hr className="my-4 border-[var(--dash-border)]" />
          <div className="text-sm">
            <div className="font-bold text-[var(--dash-text)]">Prepared For:</div>
            <div className="mt-1 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{client.name}</div>
              {client.address && <div>{client.address}</div>}
              {client.city && <div>{client.city}{client.state ? `, ${client.state}` : ""} {client.zip || ""}</div>}
              {client.phone && <div>{formatPhone(client.phone)}</div>}
              {client.email && <div>{client.email}</div>}
            </div>
          </div>
          {estimate.title && <div className="mt-4 text-sm"><span className="font-semibold text-[var(--dash-text)]">Project:</span> {estimate.title}</div>}
          <div className="mt-6 overflow-hidden rounded-[11px] border border-[var(--dash-border-table)]">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--dash-navy)" }} className="text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Item</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Description</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Price</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((it, i) => (
                  <tr key={i} className="border-t border-[var(--dash-border-table)] align-top">
                    <td className="px-4 py-2.5 font-bold text-[var(--dash-text)]"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} /> {it.name || "—"}</div></td>
                    <td className="px-4 py-2.5 text-[var(--dash-text-secondary)]">{it.description}</td>
                    <td className="px-4 py-2.5 text-[var(--dash-text-secondary)]">{it.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(it.unit_price))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(Number(estimate.subtotal))}</span></div>
              {Number(estimate.discount) > 0 && <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Discount</span><span className="tabular-nums">-{fmt(Number(estimate.discount))}</span></div>}
              <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base">
                <span className="font-semibold">{estimate.billing_type === "monthly" ? "Monthly Payment" : "Total"}</span>
                <span className="font-extrabold tabular-nums text-[var(--dash-text)]">{fmt(Number(estimate.total))}{estimate.billing_type === "monthly" && "/mo"}</span>
              </div>
            </div>
          </div>
          {estimate.notes && (
            <div className="mt-6 rounded-[10px] bg-[var(--dash-surface-soft)] p-4 text-sm text-[var(--dash-text-secondary)]">
              <div className="font-semibold text-[var(--dash-text)]">Notes</div>
              <p className="mt-1 whitespace-pre-line">{estimate.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
