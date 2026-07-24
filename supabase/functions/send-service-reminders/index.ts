// Scheduled Edge Function (set up a Cron trigger for this function in the
// Supabase Dashboard — every 5 minutes is a good default). Finds service
// jobs whose reminder time has arrived and pushes a Web Push notification
// to every device the assigned technician has enabled reminders on.
//
// Requires two secrets set on this function (Dashboard > Edge Functions >
// send-service-reminders > Secrets): VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:support@sundownpoolcare.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// The business operates out of Sarasota, FL — technicians pick scheduled_date/
// scheduled_time as their own local wall-clock, with no timezone attached (a
// Postgres TIME column can't carry one). This edge function, though, always
// runs in UTC. Naively doing `new Date(`${date}T${time}`)` would silently
// treat that wall-clock string as UTC — off by 4-5 hours depending on
// EDT/EST — which pushed every job's computed time outside the grace window
// and meant reminders never fired. Convert explicitly via the IANA zone
// instead, so the DST offset is resolved correctly for the given date.
const BUSINESS_TIMEZONE = "America/New_York";

function zonedWallClockToUtcMs(dateStr: string, timeStr: string, timeZone: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi, s] = timeStr.split(":").map(Number);
  const guessUtcMs = Date.UTC(y, mo - 1, d, h, mi, s || 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(guessUtcMs)).map((p) => [p.type, p.value]));
  const asIfUtcMs = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  const offsetMs = asIfUtcMs - guessUtcMs;
  return guessUtcMs - offsetMs;
}

// How long past the scheduled time a reminder is still worth sending —
// guards against a burst of stale reminders if the cron job was paused.
const GRACE_MS = 2 * 60 * 60 * 1000;

Deno.serve(async () => {
  const { data: jobs, error } = await supabase
    .from("service_jobs")
    .select("id, technician_id, title, scheduled_date, scheduled_time, reminder_minutes_before, clients(name)")
    .eq("reminder_enabled", true)
    .is("reminder_sent_at", null)
    .neq("status", "Concluído")
    .not("scheduled_date", "is", null)
    .not("scheduled_time", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const now = Date.now();
  const due = (jobs ?? []).filter((job) => {
    const scheduledAt = zonedWallClockToUtcMs(job.scheduled_date, job.scheduled_time, BUSINESS_TIMEZONE);
    const fireAt = scheduledAt - (job.reminder_minutes_before ?? 0) * 60000;
    return now >= fireAt && now - scheduledAt < GRACE_MS;
  });

  let sent = 0;
  for (const job of due) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("technician_id", job.technician_id);

    const clientName = (job as { clients?: { name?: string } | null }).clients?.name ?? "";
    const timeLabel = job.scheduled_time ? job.scheduled_time.slice(0, 5) : "";
    const payload = JSON.stringify({
      title: "Lembrete de serviço",
      body: `${job.title}${clientName ? ` — ${clientName}` : ""}${timeLabel ? ` às ${timeLabel}` : ""}`,
      url: "/tecnico?view=servicos",
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await supabase.from("service_jobs").update({ reminder_sent_at: new Date().toISOString() }).eq("id", job.id);
  }

  return new Response(JSON.stringify({ jobsDue: due.length, notificationsSent: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
