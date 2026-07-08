import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({ token: z.string().uuid() });

export const getPublicEstimate = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: estimate, error: eErr } = await supabaseAdmin
      .from("estimates")
      .select("id, number, title, estimate_date, valid_until, status, subtotal, discount, total, notes, client_id")
      .eq("public_token", data.token)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!estimate) return null;

    const [{ data: client, error: cErr }, { data: items, error: iErr }] = await Promise.all([
      supabaseAdmin
        .from("clients")
        .select("name, email, phone, address, city, state, zip")
        .eq("id", estimate.client_id)
        .maybeSingle(),
      supabaseAdmin
        .from("estimate_items")
        .select("name, description, qty, unit_price, total, position")
        .eq("estimate_id", estimate.id)
        .order("position", { ascending: true }),
    ]);
    if (cErr) throw cErr;
    if (iErr) throw iErr;

    const { client_id: _client_id, ...estimatePublic } = estimate;
    return { estimate: estimatePublic, client, items: items ?? [] };
  });
