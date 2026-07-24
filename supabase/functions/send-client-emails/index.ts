// Scheduled Edge Function (set up a Cron trigger for this function in the
// Supabase Dashboard — every 5 minutes is a good default, same as
// send-service-reminders). Emails clients who opted in (clients.notify_by_email)
// at two points in their visit:
//   1. As soon as the technician starts the stop ("on the way").
//   2. Once the visit is completed AND chemicals have been logged for it
//      (includes the readings + an optional visit photo).
//
// Requires one secret set on this function (Dashboard > Edge Functions >
// send-client-emails > Secrets): RESEND_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS = "Sundown Pool Care <no_reply@sundownpoolcare.com>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

const CHEMICAL_LABELS: Record<string, string> = {
  free_chlorine: "Free Chlorine (ppm)",
  ph: "pH",
  total_alkalinity: "Total Alkalinity (ppm)",
  calcium_hardness: "Calcium Hardness (ppm)",
  stabilizer: "Stabilizer / CYA (ppm)",
  salt: "Salt (ppm)",
};

type ClientRow = { id: string; name: string; email: string | null; notify_by_email: boolean };

Deno.serve(async () => {
  let onWaySent = 0;
  let completionSent = 0;
  const errors: string[] = [];

  // 1. "On the way" — stop just started, client opted in, not yet sent.
  const { data: startedStops, error: startedErr } = await supabase
    .from("route_stops")
    .select("id, client:clients!inner(id, name, email, notify_by_email)")
    .eq("status", "Em serviço")
    .is("on_way_email_sent_at", null)
    .eq("clients.notify_by_email", true);

  if (startedErr) return new Response(JSON.stringify({ error: startedErr.message }), { status: 500 });

  for (const stop of (startedStops ?? []) as { id: string; client: ClientRow | ClientRow[] }[]) {
    const client = Array.isArray(stop.client) ? stop.client[0] : stop.client;
    if (!client?.email) continue;
    try {
      await sendEmail(
        client.email,
        "Your Sundown Pool Care technician is on the way!",
        `<p>Hi ${client.name},</p>
         <p>Just a quick heads up — your Sundown Pool Care technician is on the way to service your pool today.</p>
         <p>Thanks for choosing Sundown Pool Care!</p>`,
      );
      await supabase.from("route_stops").update({ on_way_email_sent_at: new Date().toISOString() }).eq("id", stop.id);
      onWaySent++;
    } catch (err) {
      errors.push(`on-way ${stop.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Completion — stop completed, client opted in, not yet sent. Chemicals
  // may not be logged yet (technician still finishing up), so this is
  // checked per-stop below and simply skipped until they are — the next
  // cron run picks it up once saved.
  const { data: completedStops, error: completedErr } = await supabase
    .from("route_stops")
    .select("id, completed_at, visit_photos, client:clients!inner(id, name, email, notify_by_email)")
    .eq("status", "Concluído")
    .is("completion_email_sent_at", null)
    .eq("clients.notify_by_email", true);

  if (completedErr) return new Response(JSON.stringify({ error: completedErr.message }), { status: 500 });

  for (const stop of (completedStops ?? []) as {
    id: string; completed_at: string | null; visit_photos: string[] | null; client: ClientRow | ClientRow[];
  }[]) {
    const client = Array.isArray(stop.client) ? stop.client[0] : stop.client;
    if (!client?.email) continue;

    const { data: chem } = await supabase
      .from("stop_chemicals")
      .select("free_chlorine, ph, total_alkalinity, calcium_hardness, stabilizer, salt")
      .eq("route_stop_id", stop.id)
      .eq("body_type", "pool")
      .maybeSingle();

    if (!chem) continue;

    let photoHtml = "";
    const photoPath = stop.visit_photos?.[0];
    if (photoPath) {
      const { data: signed } = await supabase.storage
        .from("client-photos")
        .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        photoHtml = `<p><img src="${signed.signedUrl}" alt="Visit photo" style="max-width:100%;border-radius:8px;" /></p>`;
      }
    }

    const readingsRows = Object.entries(CHEMICAL_LABELS)
      .map(([key, label]) => {
        const value = (chem as Record<string, number | null>)[key];
        if (value === null || value === undefined) return "";
        return `<tr><td style="padding:4px 12px 4px 0;color:#5B6472;">${label}</td><td style="padding:4px 0;font-weight:bold;">${value}</td></tr>`;
      })
      .join("");

    const visitDate = stop.completed_at ? new Date(stop.completed_at) : new Date();
    const dateLabel = visitDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeLabel = visitDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    try {
      await sendEmail(
        client.email,
        "Your pool service is complete",
        `<p>Hi ${client.name},</p>
         <p>Your pool was serviced on ${dateLabel} at ${timeLabel}. Here are the chemical readings from today's visit:</p>
         <table cellspacing="0" cellpadding="0">${readingsRows}</table>
         ${photoHtml}
         <p>Thanks for choosing Sundown Pool Care!</p>`,
      );
      await supabase.from("route_stops").update({ completion_email_sent_at: new Date().toISOString() }).eq("id", stop.id);
      completionSent++;
    } catch (err) {
      errors.push(`completion ${stop.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Response(JSON.stringify({ onWaySent, completionSent, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
