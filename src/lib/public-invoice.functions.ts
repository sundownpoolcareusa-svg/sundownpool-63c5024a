import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const inputSchema = z.object({ token: z.string().uuid() });

type PublicInvoiceRpcResult = {
  invoice: {
    id: string; number: string; invoice_date: string; due_date: string | null;
    status: string; subtotal: number; total: number; notes: string | null;
  };
  client: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null } | null;
  items: Array<{ service: string; description: string; qty: number; rate: number; amount: number; position: number }>;
};

// Uses the get_invoice_public SECURITY DEFINER RPC (anonymous, token-gated)
// instead of the service-role client — this deployment's host never has
// SUPABASE_SERVICE_ROLE_KEY available (Lovable Cloud manages it internally
// and doesn't expose it), so any query that required it always failed.
export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: result, error } = await supabase.rpc("get_invoice_public", { _token: data.token });
    if (error) throw error;
    if (!result) return null;
    return result as unknown as PublicInvoiceRpcResult;
  });
