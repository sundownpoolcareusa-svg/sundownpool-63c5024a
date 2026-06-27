import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocCardHeader } from "@/components/InvoiceCard";
import { fmt, fmtDate } from "@/lib/db";
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invoice_public" as never, { _token: token } as never);

      if (error) throw error;
      if (!data) throw new Error("Invoice not found");
      return data as PublicInvoice;
    },
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;
  if (error || !data) return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-slate-900">Invoice not found</h1>
        <p className="mt-2 text-sm text-slate-600">This link may be invalid or has been revoked.</p>
      </div>
    </div>
  );

  const { invoice, client, items } = data;
  const isPaid = invoice.status === "PAID";
  const sortedItems = [...(items ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-slate-50 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div className={`rounded px-3 py-1 text-xs font-bold ${isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {isPaid ? "PAID" : "UNPAID"}
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white pt-1 pb-5 px-5 shadow-sm print:border-0 print:shadow-none">
          <DocCardHeader title="INVOICE" number={invoice.number} />
          <div className="mt-1 grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 text-slate-700">
              <div>4008 Destination Dr #2208</div>
              <div>Osprey, FL 34229</div>
              <div>(407) 555-1234</div>
              <div>hello@sundownpoolservice.com</div>
            </div>
            <div className="space-y-1 text-right text-slate-700">
              <div><span className="font-semibold text-slate-900">Date:</span> {fmtDate(invoice.invoice_date)}</div>
              <div><span className="font-semibold text-slate-900">Due Date:</span> {fmtDate(invoice.due_date)}</div>
              <div><span className="font-semibold text-slate-900">Status:</span> <span className={isPaid ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>{isPaid ? "PAID" : "UNPAID"}</span></div>
            </div>
          </div>
          <hr className="my-4 border-slate-100" />
          <div className="text-sm">
            <div className="font-bold text-slate-900">Bill To:</div>
            <div className="mt-1 space-y-0.5 text-slate-700">
              <div>{client.name}</div>
              {client.address && <div>{client.address}</div>}
              {client.city && <div>{client.city}{client.state ? `, ${client.state}` : ""} {client.zip || ""}</div>}
              {client.phone && <div>{client.phone}</div>}
              {client.email && <div>{client.email}</div>}
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-[var(--brand-blue)] text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">SERVICE</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">DESCRIPTION</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">QTY</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">RATE</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2.5 font-semibold text-slate-900"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[var(--brand-blue)]" /> {it.service || "—"}</div></td>
                    <td className="px-4 py-2.5 text-slate-700">{it.description}</td>
                    <td className="px-4 py-2.5 text-slate-700">{it.qty}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(Number(it.rate))}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(Number(it.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>{fmt(Number(invoice.subtotal))}</span></div>
              <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className={`font-extrabold ${isPaid ? "text-green-600" : "text-slate-900"}`}>{fmt(Number(invoice.total))}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
