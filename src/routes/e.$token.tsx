import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef } from "react";
import { getPublicEstimate } from "@/lib/public-estimate.functions";
import { DocCardHeader } from "@/components/InvoiceCard";
import { fmt, fmtDate } from "@/lib/db";
import { formatPhone, downloadElementAsPdf } from "@/lib/pdf";
import { Wrench, Download } from "lucide-react";

export const Route = createFileRoute("/e/$token")({
  component: PublicEstimatePage,
});

type PublicEstimate = {
  estimate: {
    id: string; number: string; title: string | null; estimate_date: string; valid_until: string | null;
    status: string; subtotal: number; discount: number; total: number; notes: string | null;
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

  if (isLoading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;
  if (error || !data) return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-slate-900">Estimate not found</h1>
        <p className="mt-2 text-sm text-slate-600">This link may be invalid or has been revoked.</p>
      </div>
    </div>
  );

  const { estimate, client, items } = data;
  const isApproved = estimate.status === "APROVADA";
  const sortedItems = [...(items ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-slate-50 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div className={`rounded px-3 py-1 text-xs font-bold ${isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {statusLabel(estimate.status)}
          </div>
          <button
            onClick={() => { if (pdfRef.current) downloadElementAsPdf(pdfRef.current, `${client?.name || "Client"} ${estimate.number}`); }}
            className="flex items-center gap-2 rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <div ref={pdfRef} className="pdf-print rounded-xl border border-slate-200 bg-white pt-1 pb-5 px-5 shadow-sm print:border-0 print:shadow-none">
          <DocCardHeader title="ESTIMATE" number={estimate.number} />
          <div className="mt-1 grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 text-slate-700">
              <div>4008 Destination Dr</div>
              <div>Osprey, FL 34229</div>
              <div>(561) 376-2428</div>
            </div>
            <div className="space-y-1 text-right text-slate-700">
              <div><span className="font-semibold text-slate-900">Date:</span> {fmtDate(estimate.estimate_date)}</div>
              <div><span className="font-semibold text-slate-900">Valid Until:</span> {fmtDate(estimate.valid_until)}</div>
              <div><span className="font-semibold text-slate-900">Status:</span> <span className="font-bold">{statusLabel(estimate.status)}</span></div>
            </div>
          </div>
          <hr className="my-4 border-slate-100" />
          <div className="text-sm">
            <div className="font-bold text-slate-900">Prepared For:</div>
            <div className="mt-1 space-y-0.5 text-slate-700">
              <div>{client.name}</div>
              {client.address && <div>{client.address}</div>}
              {client.city && <div>{client.city}{client.state ? `, ${client.state}` : ""} {client.zip || ""}</div>}
              {client.phone && <div>{formatPhone(client.phone)}</div>}
              {client.email && <div>{client.email}</div>}
            </div>
          </div>
          {estimate.title && <div className="mt-4 text-sm"><span className="font-semibold text-slate-900">Project:</span> {estimate.title}</div>}
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-[var(--doc-blue)] text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">ITEM</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">DESCRIPTION</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">QTY</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">PRICE</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2.5 font-bold text-slate-900"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[var(--doc-blue)]" /> {it.name || "—"}</div></td>
                    <td className="px-4 py-2.5 text-slate-700">{it.description}</td>
                    <td className="px-4 py-2.5 text-slate-700">{it.qty}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(Number(it.unit_price))}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(Number(estimate.subtotal))}</span></div>
              {Number(estimate.discount) > 0 && <div className="flex justify-between text-slate-700"><span>Discount</span><span>-{fmt(Number(estimate.discount))}</span></div>}
              <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className="font-extrabold text-slate-900">{fmt(Number(estimate.total))}</span></div>
            </div>
          </div>
          {estimate.notes && (
            <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Notes</div>
              <p className="mt-1 whitespace-pre-line">{estimate.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
