import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({ token: z.string().uuid() });

export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, number, invoice_date, due_date, status, subtotal, total, notes, client_id")
      .eq("public_token", data.token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invoice) return null;

    const [{ data: client, error: cErr }, { data: items, error: iErr }] = await Promise.all([
      supabaseAdmin
        .from("clients")
        .select("name, email, phone, address, city, state, zip")
        .eq("id", invoice.client_id)
        .maybeSingle(),
      supabaseAdmin
        .from("invoice_items")
        .select("service, description, qty, rate, amount, position")
        .eq("invoice_id", invoice.id)
        .order("position", { ascending: true }),
    ]);
    if (cErr) throw cErr;
    if (iErr) throw iErr;

    const { client_id: _client_id, ...invoicePublic } = invoice;
    return { invoice: invoicePublic, client, items: items ?? [] };
  });
