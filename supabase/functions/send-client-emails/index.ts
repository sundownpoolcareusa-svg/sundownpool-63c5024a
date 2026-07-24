// Scheduled Edge Function (set up a Cron trigger for this function in the
// Supabase Dashboard — every 5 minutes is a good default, same as
// send-service-reminders). Sends up to three separate emails per visit,
// each independently opted into per client (clients.notify_on_way /
// notify_chemicals / notify_photo):
//   1. As soon as the technician starts the stop ("on the way").
//   2. Once chemicals are logged for the completed visit (readings only).
//   3. Once a visit photo is attached to the completed visit (photo only).
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

function firstOf<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[0] : v;
}

type ClientRow = { id: string; name: string; email: string | null };

Deno.serve(async () => {
  let onWaySent = 0;
  let chemicalsSent = 0;
  let photoSent = 0;
  const errors: string[] = [];

  // 1. "On the way" — stop has been started (started_at set), client opted
  // in, not yet sent. Checked via started_at rather than the current status
  // = 'Em serviço' — a fast technician can start and finish a visit within
  // one cron cycle, and by the time this runs the stop may already be
  // 'Concluído'. started_at only gets set on a genuine Em serviço
  // transition, so this never fires for a stop that skipped straight to
  // Concluído without one.
  const { data: startedStops, error: startedErr } = await supabase
    .from("route_stops")
    .select("id, client:clients!inner(id, name, email, notify_on_way)")
    .not("started_at", "is", null)
    .is("on_way_email_sent_at", null)
    .eq("clients.notify_on_way", true);

  if (startedErr) return new Response(JSON.stringify({ error: startedErr.message }), { status: 500 });

  for (const stop of (startedStops ?? []) as { id: string; client: (ClientRow & { notify_on_way: boolean }) | (ClientRow & { notify_on_way: boolean })[] }[]) {
    const client = firstOf(stop.client);
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

  // 2. Chemical readings — stop completed, client opted in, not yet sent.
  // Waits for the stop_chemicals row to exist (technician may still be
  // finishing up when the stop first flips to Concluído) — simply skipped
  // until it does, picked up on a later cron run.
  const { data: chemStops, error: chemErr } = await supabase
    .from("route_stops")
    .select("id, completed_at, client:clients!inner(id, name, email, notify_chemicals, has_salt_system)")
    .eq("status", "Concluído")
    .is("chemicals_email_sent_at", null)
    .eq("clients.notify_chemicals", true);

  if (chemErr) return new Response(JSON.stringify({ error: chemErr.message }), { status: 500 });

  for (const stop of (chemStops ?? []) as {
    id: string; completed_at: string | null;
    client: (ClientRow & { notify_chemicals: boolean; has_salt_system: boolean }) | (ClientRow & { notify_chemicals: boolean; has_salt_system: boolean })[];
  }[]) {
    const client = firstOf(stop.client);
    if (!client?.email) continue;

    const { data: chem } = await supabase
      .from("stop_chemicals")
      .select("free_chlorine, ph, total_alkalinity, calcium_hardness, stabilizer, salt")
      .eq("route_stop_id", stop.id)
      .eq("body_type", "pool")
      .maybeSingle();

    if (!chem) continue;

    // Salt is only ever shown to the technician for pools flagged as having
    // a salt system — the reading still gets saved regardless (defaults to
    // a placeholder value), so it must be excluded here the same way.
    const readingsRows = Object.entries(CHEMICAL_LABELS)
      .filter(([key]) => key !== "salt" || client.has_salt_system)
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
        "Your pool chemical readings",
        `<p>Hi ${client.name},</p>
         <p>Your pool was serviced on ${dateLabel} at ${timeLabel}. Here are the chemical readings from today's visit:</p>
         <table cellspacing="0" cellpadding="0">${readingsRows}</table>
         <p>Thanks for choosing Sundown Pool Care!</p>`,
      );
      await supabase.from("route_stops").update({ chemicals_email_sent_at: new Date().toISOString() }).eq("id", stop.id);
      chemicalsSent++;
    } catch (err) {
      errors.push(`chemicals ${stop.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Visit photo — stop completed, client opted in, a photo attached, not
  // yet sent. Independent of the chemicals email — a photo added later (or
  // not at all) doesn't hold up or merge with the readings email.
  const { data: photoStops, error: photoErr } = await supabase
    .from("route_stops")
    .select("id, completed_at, visit_photos, client:clients!inner(id, name, email, notify_photo)")
    .eq("status", "Concluído")
    .is("photo_email_sent_at", null)
    .not("visit_photos", "eq", "{}")
    .eq("clients.notify_photo", true);

  if (photoErr) return new Response(JSON.stringify({ error: photoErr.message }), { status: 500 });

  for (const stop of (photoStops ?? []) as {
    id: string; completed_at: string | null; visit_photos: string[] | null;
    client: (ClientRow & { notify_photo: boolean }) | (ClientRow & { notify_photo: boolean })[];
  }[]) {
    const client = firstOf(stop.client);
    if (!client?.email) continue;

    const photoPath = stop.visit_photos?.[0];
    if (!photoPath) continue;

    const { data: signed } = await supabase.storage
      .from("client-photos")
      .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
    if (!signed?.signedUrl) continue;

    const visitDate = stop.completed_at ? new Date(stop.completed_at) : new Date();
    const dateLabel = visitDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeLabel = visitDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    try {
      await sendEmail(
        client.email,
        "A photo from your pool visit",
        `<p>Hi ${client.name},</p>
         <p>Here's a photo from your pool visit on ${dateLabel} at ${timeLabel}.</p>
         <p><img src="${signed.signedUrl}" alt="Visit photo" style="max-width:100%;border-radius:8px;" /></p>
         <p>Thanks for choosing Sundown Pool Care!</p>`,
      );
      await supabase.from("route_stops").update({ photo_email_sent_at: new Date().toISOString() }).eq("id", stop.id);
      photoSent++;
    } catch (err) {
      errors.push(`photo ${stop.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Response(JSON.stringify({ onWaySent, chemicalsSent, photoSent, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
