import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef } from "react";
import { getPublicInvoice } from "@/lib/public-invoice.functions";
import { DocCardHeader } from "@/components/InvoiceCard";
import { fmt, fmtDate, formatPhone } from "@/lib/db";
import { downloadElementAsPdf } from "@/lib/pdf";
import { Wrench, Download } from "lucide-react";

export const Route = createFileRoute("/i/$token")({
  component: PublicInvoicePage,
});

type PublicInvoice = {
  invoice: {
    id: string; number: string; invoice_date: string; due_date: string | null;
    status: string; subtotal: number; total: number; notes: string | null;
  };
  client: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null };
  items: Array<{ service: string; description: string; qty: number; rate: number; amount: number; position: number }>;
};

function PublicInvoicePage() {
  const { token } = Route.useParams();
  const fetchInvoice = useServerFn(getPublicInvoice);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: async () => {
      const result = await fetchInvoice({ data: { token } });
      if (!result) throw new Error("Invoice not found");
      return result as PublicInvoice;
    },
  });


  if (isLoading) return <div className="dash grid min-h-screen place-items-center text-[var(--dash-text-muted)]">Loading...</div>;
  if (error || !data) return (
    <div className="dash grid min-h-screen place-items-center bg-[var(--dash-bg)] p-6">
      <div className="rounded-[18px] border border-[var(--dash-border)] bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-[var(--dash-text)]">Invoice not found</h1>
        <p className="mt-2 text-sm text-[var(--dash-text-secondary)]">This link may be invalid or has been revoked.</p>
      </div>
    </div>
  );

  const { invoice, client, items } = data;
  const isPaid = invoice.status === "PAID";
  const sortedItems = [...(items ?? [])].sort((a, b) => a.position - b.position);
  const pdfRef = useRef<HTMLDivElement>(null);

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div
            className="rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{
              background: isPaid ? "var(--dash-badge-paid-bg)" : "var(--dash-badge-unpaid-bg)",
              color: isPaid ? "var(--dash-badge-paid-text)" : "var(--dash-badge-unpaid-text)",
            }}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </div>
          <button
            onClick={() => {
              if (!pdfRef.current) return;
              downloadElementAsPdf(pdfRef.current, `${client?.name || "Client"} ${invoice.number}`);
            }}
            className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <div ref={pdfRef} className="rounded-[20px] border border-[var(--dash-border)] bg-white px-[26px] pb-[26px] pt-1 print:border-0 print:shadow-none" style={{ boxShadow: "0 1px 2px rgba(20,36,60,.03)" }}>
          <DocCardHeader title="INVOICE" number={invoice.number} />
          <div className="mt-1 grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 text-[var(--dash-text-secondary)]">
            <div className="font-bold text-[var(--dash-text)]">Effect Up LLC</div>
            <div>4008 Destination Dr Apt 2208</div>
            <div>Osprey, FL 34229</div>
            <div>(561) 376-2428</div>
          </div>
            <div className="space-y-1 text-right text-[var(--dash-text-secondary)]">
              <div><span className="font-semibold text-[var(--dash-text)]">Date:</span> {fmtDate(invoice.invoice_date)}</div>
              <div><span className="font-semibold text-[var(--dash-text)]">Due Date:</span> {fmtDate(invoice.due_date)}</div>
              <div><span className="font-semibold text-[var(--dash-text)]">Status:</span> <span className="font-bold" style={{ color: isPaid ? "var(--dash-green)" : "var(--dash-badge-unpaid-text)" }}>{isPaid ? "PAID" : "UNPAID"}</span></div>
            </div>
          </div>
          <hr className="my-4 border-[var(--dash-border)]" />
          <div className="text-sm">
            <div className="font-bold text-[var(--dash-text)]">Bill To:</div>
            <div className="mt-1 space-y-0.5 text-[var(--dash-text-secondary)]">
              <div>{client.name}</div>
              {client.address && <div>{client.address}</div>}
              {client.city && <div>{client.city}{client.state ? `, ${client.state}` : ""} {client.zip || ""}</div>}
              {client.phone && <div>{formatPhone(client.phone)}</div>}
              {client.email && <div>{client.email}</div>}
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-[11px] border border-[var(--dash-border-table)]">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--dash-navy)" }} className="text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Service</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Description</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em]">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Rate</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((it, i) => (
                  <tr key={i} className="border-t border-[var(--dash-border-table)] align-top">
                    <td className="px-4 py-2.5 font-bold text-[var(--dash-text)]"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} /> {it.service || "—"}</div></td>
                    <td className="px-4 py-2.5 text-[var(--dash-text-secondary)]">{it.description}</td>
                    <td className="px-4 py-2.5 text-[var(--dash-text-secondary)]">{it.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(it.rate))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--dash-text-secondary)]">{fmt(Number(it.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--dash-text-secondary)]"><span>Subtotal</span><span className="tabular-nums">{fmt(Number(invoice.subtotal))}</span></div>
              <div className="flex justify-between border-t border-[var(--dash-border)] pt-2 text-base"><span className="font-semibold">Total</span><span className="font-extrabold tabular-nums" style={{ color: isPaid ? "var(--dash-green)" : "var(--dash-text)" }}>{fmt(Number(invoice.total))}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
