import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { DocCardHeader } from "@/components/InvoiceCard";
import {
  Plus, Search, Filter, FileText, Download, MoreHorizontal,
  Droplet, Wrench, ShoppingBasket, FlaskConical, Calendar, CheckCircle2, ChevronDown, Sparkles,
} from "lucide-react";
import poolImg from "@/assets/pool.jpg";

export const Route = createFileRoute("/invoice")({
  component: InvoicePage,
});

const invoices = [
  { id: "INV-2025-058", client: "John Smith", date: "Jun 26, 2025", amount: "$250.00", status: "PAID", active: true },
  { id: "INV-2025-057", client: "Sarah Johnson", date: "Jun 24, 2025", amount: "$175.00", status: "SENT" },
  { id: "INV-2025-056", client: "Michael Brown", date: "Jun 23, 2025", amount: "$320.00", status: "SENT" },
  { id: "INV-2025-055", client: "Emma Davis", date: "Jun 20, 2025", amount: "$150.00", status: "OVERDUE" },
  { id: "INV-2025-054", client: "David Wilson", date: "Jun 18, 2025", amount: "$200.00", status: "PAID" },
];

const tabs = ["All", "Paid", "Sent", "Overdue", "Draft"];

const lineItems = [
  { desc: "Pool Cleaning – Standard", qty: 1, rate: "$100.00", amount: "$100.00" },
  { desc: "Filter Cleaning", qty: 1, rate: "$50.00", amount: "$50.00" },
  { desc: "Water Chemical Balance", qty: 1, rate: "$40.00", amount: "$40.00" },
  { desc: "Pool Equipment Check", qty: 1, rate: "$30.00", amount: "$30.00" },
  { desc: "Skimmer & Basket Cleaning", qty: 1, rate: "$30.00", amount: "$30.00" },
];

const estimateServices = [
  { icon: Droplet, label: "Pool Inspection", price: "$75.00" },
  { icon: Sparkles, label: "Equipment Repair", price: "$250.00" },
  { icon: Sparkles, label: "Tile Cleaning", price: "$120.00" },
  { icon: FileText, label: "Filter Replacement", price: "$200.00" },
  { icon: FlaskConical, label: "Water Balance & Chemicals", price: "$80.00" },
];

const footerCats = [
  { icon: Droplet, title: "Pool Cleaning", text: "Regular cleaning and maintenance" },
  { icon: Wrench, title: "Repairs", text: "Equipment and system repairs" },
  { icon: ShoppingBasket, title: "Equipment", text: "Filters, pumps and equipment" },
  { icon: FlaskConical, title: "Chemicals", text: "Water balance and chemical treatment" },
  { icon: Calendar, title: "Scheduled Service", text: "Weekly, bi-weekly or monthly service" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    SENT: "bg-sky-100 text-sky-700",
    OVERDUE: "bg-orange-100 text-orange-700",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

function InvoicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader showBellBadge={false} />
      <main className="grid grid-cols-12 gap-5 p-5">
        {/* LEFT */}
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900">Invoices</h1>
            <button className="flex items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </div>
          <div className="flex gap-4 border-b text-sm">
            {tabs.map((t, i) => (
              <button key={t} className={`pb-2 ${i === 0 ? "border-b-2 border-[var(--brand-blue)] text-[var(--brand-blue)] font-semibold" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input placeholder="Search invoices..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-[var(--brand-blue)]"><Filter className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className={`rounded-lg border bg-white p-4 ${inv.active ? "border-[var(--brand-blue)]/40 bg-sky-50/60" : "border-slate-200"}`}>
                <div className="flex items-start justify-between">
                  <div className="font-bold text-[var(--brand-blue)]">{inv.id}</div>
                  <div className={`font-bold ${inv.status === "PAID" && inv.active ? "text-green-600" : "text-slate-900"}`}>{inv.amount}</div>
                </div>
                <div className="mt-1 flex items-end justify-between">
                  <div>
                    <div className="text-sm text-slate-700">{inv.client}</div>
                    <div className="text-xs text-slate-500">{inv.date}</div>
                  </div>
                  {statusBadge(inv.status)}
                </div>
              </div>
            ))}
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700">
            <FileText className="h-4 w-4" /> View All Invoices
          </button>
        </aside>

        {/* CENTER */}
        <section className="col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900">Invoice</h2>
              <span className="rounded-md bg-green-500 px-2.5 py-1 text-xs font-bold text-white">PAID</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                <Download className="h-4 w-4 text-[var(--brand-blue)]" /> Download PDF
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <DocCardHeader title="INVOICE" number="INV-2025-058" />
            <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1 text-slate-700">
                <div>123 Blue Water Way</div>
                <div>Orlando, FL 32801</div>
                <div>(407) 555-1234</div>
                <div>hello@aquaclearpools.com</div>
              </div>
              <div className="space-y-1 text-right text-slate-700">
                <div><span className="font-semibold text-slate-900">Date:</span> Jun 26, 2025</div>
                <div><span className="font-semibold text-slate-900">Due Date:</span> Jul 10, 2025</div>
              </div>
            </div>

            <hr className="my-6 border-slate-100" />

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-bold text-slate-900">Bill To:</div>
                <div className="mt-1 space-y-0.5 text-slate-700">
                  <div>John Smith</div>
                  <div>123 Lakeview Dr</div>
                  <div>Orlando, FL 32801</div>
                  <div>(407) 555-9876</div>
                  <div>johnsmith@email.com</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Service Address:</div>
                <div className="mt-1 space-y-0.5 text-slate-700">
                  <div>123 Lakeview Dr</div>
                  <div>Orlando, FL 32801</div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-[var(--brand-blue)] text-white">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">DESCRIPTION</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold tracking-wide">QTY</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">RATE</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold tracking-wide">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((it) => (
                    <tr key={it.desc} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-700">{it.desc}</td>
                      <td className="px-4 py-2.5 text-slate-700">{it.qty}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{it.rate}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{it.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>$250.00</span></div>
                <div className="flex justify-between text-slate-700"><span>Tax (0%)</span><span>$0.00</span></div>
                <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className="font-extrabold text-green-600">$250.00</span></div>
              </div>
            </div>

            <hr className="my-6 border-slate-100" />

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-2xl text-[var(--brand-blue)]" style={{ fontFamily: "cursive" }}>Thank you!</div>
                <div className="text-slate-600">We appreciate your business!</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Payment Method</div>
                <div className="text-slate-700">Paid on Jun 26, 2025</div>
                <div className="text-slate-700">Credit Card (•••• 4242)</div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900">Estimate #EST-2025-031</h3>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">PENDING</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={poolImg} alt="Pool" className="h-44 w-full object-cover" width={1024} height={640} loading="lazy" />
            <div className="p-4">
              <div className="font-bold text-slate-900">Pool Repair & Maintenance</div>
              <p className="mt-1 text-sm text-slate-600">Complete pool repair and maintenance service to keep your pool clean, safe and enjoyable.</p>
              <hr className="my-4 border-slate-100" />
              <div className="space-y-3">
                {estimateServices.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 text-[var(--brand-blue)]" />
                      <span className="text-slate-700">{s.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{s.price}</span>
                  </div>
                ))}
              </div>
              <hr className="my-4 border-slate-100" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-700"><span>Subtotal</span><span>$725.00</span></div>
                <div className="flex justify-between text-slate-700"><span>Tax (0%)</span><span>$0.00</span></div>
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-extrabold text-[var(--brand-blue)]">$725.00</span>
                </div>
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4" /> Approve Estimate
              </button>
              <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 py-2.5 text-sm font-semibold text-[var(--brand-blue)]">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* FOOTER CATEGORIES */}
      <section className="mx-5 mb-6 rounded-xl border border-slate-200 bg-white px-6 py-6">
        <div className="grid grid-cols-5 gap-6">
          {footerCats.map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <c.icon className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-blue)]" />
              <div>
                <div className="font-bold text-slate-900">{c.title}</div>
                <div className="text-sm text-slate-600">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
