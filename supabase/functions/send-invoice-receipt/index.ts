// Sends a one-off "payment received" email for a single invoice, on demand
// from the admin — right after marking an invoice paid, the owner is asked
// whether to email the client a receipt, and this is what actually sends
// it. Not the same thing as send-client-emails: that's a scheduled sweep
// covering the recurring on-the-way/chemicals/photo notifications, this is
// an explicit, immediate, single-invoice action invoked directly from the
// browser (supabase.functions.invoke), so it authenticates the caller and
// checks invoice ownership instead of running with no request context.
//
// Requires one secret set on this function (Dashboard > Edge Functions >
// send-invoice-receipt > Secrets): RESEND_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS = "Sundown Pool Care <no_reply@sundownpoolcare.com>";
const SITE_URL = "https://sundownpoolcare.com";

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
// (comma/semicolon separated) — same parsing send-client-emails uses.
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

  let body: { invoice_id?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  if (!body.invoice_id) return fail("Missing invoice_id");

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .select("id, number, total, status, payment_method, public_token, user_id, client:clients(name, email)")
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

  const publicUrl = `${SITE_URL}/i/${invoice.public_token}`;
  const amount = Number(invoice.total ?? 0).toFixed(2);

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
        subject: `Payment received — Invoice ${invoice.number}`,
        html: `<p>Hi ${client?.name ?? "there"},</p>
               <p>Thanks! We've received your payment of $${amount} for invoice ${invoice.number}${invoice.payment_method ? ` via ${invoice.payment_method}` : ""}.</p>
               <p><a href="${publicUrl}">View your paid invoice</a></p>
               <p>Thanks for choosing Sundown Pool Care!</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  return ok();
});
