// Sends the invoice itself to the client ("please find the invoice
// attached" + payment instructions), on demand from the admin via a "Send
// Email" button on the invoice detail page. Distinct from
// send-invoice-receipt, which confirms a payment already received, and
// from send-client-emails, which is the scheduled sweep for the recurring
// on-the-way/chemicals/photo notifications. Same CORS/auth/ownership
// pattern as send-invoice-receipt since it's invoked directly from the
// browser (supabase.functions.invoke).
//
// Requires one secret set on this function (Dashboard > Edge Functions >
// send-invoice-email > Secrets): RESEND_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS = "Sundown Pool Care <no_reply@sundownpoolcare.com>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function fail(error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// clients.email is a single text field that can hold more than one address
// (comma/semicolon separated) — same parsing used across the other email
// functions.
function parseEmails(raw: string): string[] {
  return raw.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
}

function firstOf<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[0] : v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("Missing Authorization");

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) return fail("Not authenticated");

  let body: { invoice_id?: string; pdf_base64?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  if (!body.invoice_id) return fail("Missing invoice_id");

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .select("id, number, user_id, client:clients(name, email)")
    .eq("id", body.invoice_id)
    .maybeSingle();
  if (invErr) return fail(invErr.message);
  if (!invoice) return fail("Invoice not found");
  if (invoice.user_id !== callerData.user.id) {
    // Not the invoice owner directly — allow a technician managing
    // invoices on their employer's behalf (same check the technician
    // manages employer invoices RLS policy uses).
    const { data: tech } = await admin
      .from("technicians")
      .select("id")
      .eq("auth_user_id", callerData.user.id)
      .eq("user_id", invoice.user_id)
      .eq("can_manage_invoices", true)
      .eq("active", true)
      .maybeSingle();
    if (!tech) return fail("Not your invoice");
  }

  const client = firstOf(invoice.client as { name: string; email: string | null } | { name: string; email: string | null }[]);
  const recipients = client?.email ? parseEmails(client.email) : [];
  if (recipients.length === 0) return fail("This client has no email on file");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: recipients,
        subject: `Invoice ${invoice.number} – Pool Services`,
        html: `<p>Hi ${client?.name ?? "there"},</p>
               <p>Please find the invoice attached.</p>
               <p>Info below.</p>
               <p>Zelle: 561-460-1148<br>Name: Luiz Cunha</p>
               <p>Thank you!<br>Best regards<br>SunDown Pool Care</p>`,
        ...(body.pdf_base64
          ? { attachments: [{ filename: `Invoice-${invoice.number}.pdf`, content: body.pdf_base64 }] }
          : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  return ok();
});
