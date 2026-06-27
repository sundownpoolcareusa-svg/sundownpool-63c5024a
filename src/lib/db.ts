import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  client_type: string;
  status: string;
  created_at: string;
};

export type EstimateItem = {
  id?: string;
  name: string;
  description: string;
  qty: number;
  unit_price: number;
  total: number;
  position: number;
};

export type Estimate = {
  id: string;
  client_id: string;
  number: string;
  title: string | null;
  estimate_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  client?: Client;
  estimate_items?: EstimateItem[];
};

export type InvoiceItem = {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  position: number;
};

export type Invoice = {
  id: string;
  client_id: string;
  estimate_id: string | null;
  number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  client?: Client;
  invoice_items?: InvoiceItem[];
};

export async function listClients() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function listEstimates() {
  const { data, error } = await supabase
    .from("estimates")
    .select("*, client:clients(*), estimate_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Estimate[];
}

export async function listInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(*), invoice_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export function fmt(n: number) {
  return `$${(n ?? 0).toFixed(2)}`;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function nextNumber(prefix: string, existing: string[]) {
  const year = new Date().getFullYear();
  const rx = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    const m = n.match(rx);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}
