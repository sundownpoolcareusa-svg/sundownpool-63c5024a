import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function ok(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...body }), { headers: { "Content-Type": "application/json" } });
}

function fail(error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("Missing Authorization");

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) return fail("Not authenticated");
  const callerId = callerData.user.id;

  let body: { action?: string; technician_id?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const { action, technician_id, email, password } = body;
  if (!action || !technician_id) return fail("Missing action or technician_id");

  const { data: tech, error: techErr } = await admin
    .from("technicians")
    .select("id, user_id, auth_user_id, is_owner")
    .eq("id", technician_id)
    .maybeSingle();
  if (techErr) return fail(techErr.message);
  if (!tech || tech.user_id !== callerId) return fail("Technician not found or not yours");

  if (tech.is_owner) return fail("The Master can't have a separate technician login");

  if (action === "create") {
    if (!email || !password) return fail("Email and password are required");
    if (tech.auth_user_id) return fail("This user already has a login");

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) return fail(createErr?.message ?? "Failed to create login");

    const { error: linkErr } = await admin
      .from("technicians")
      .update({ auth_user_id: created.user.id })
      .eq("id", technician_id);
    if (linkErr) return fail(linkErr.message);

    return ok();
  }

  if (action === "reset_password") {
    if (!password) return fail("Password is required");
    if (!tech.auth_user_id) return fail("This user has no login yet");

    const { error: pwErr } = await admin.auth.admin.updateUserById(tech.auth_user_id, { password });
    if (pwErr) return fail(pwErr.message);

    return ok();
  }

  return fail(`Unknown action: ${action}`);
});
