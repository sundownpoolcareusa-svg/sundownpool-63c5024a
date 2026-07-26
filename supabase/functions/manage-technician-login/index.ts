// Creates or resets the login (email + password) a technician uses to sign
// into /tecnico. This needs the Supabase Admin API (create user / set a
// user's password directly), which only works with the service role key —
// never usable from the browser — so it has to go through this function.
//
// No secrets to configure here beyond what's automatic: SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Always responds with HTTP 200 and a { ok, error? } body — including for
// expected failures like "wrong owner" or "already has a login" — so the
// frontend (calling this via supabase.functions.invoke) can read the actual
// error message directly from the response body instead of having to dig it
// out of a thrown FunctionsHttpError.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Used for privileged operations (admin.createUser / admin.updateUserById)
// and for reading/writing the technicians table without RLS getting in the
// way — ownership is checked explicitly below instead.
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

  // A second client, scoped to the caller's own JWT, used only to find out
  // who is actually calling — kept separate from `admin` above so the
  // privileged calls always run with the service role's own credentials,
  // never the caller's.
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

  // The Master's own admin login must never also be the auth_user_id on
  // their technician row — _authenticated/route.tsx redirects ANY account
  // that matches a technician's auth_user_id straight to /tecnico, so
  // linking one here would lock the owner out of the admin dashboard.
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
