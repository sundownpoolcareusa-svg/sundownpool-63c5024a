-- Lets a technician with can_manage_invoices = true read and write their
-- employer's invoices on their employer's behalf, from the new
-- /tecnico_/invoices page. Additive policies only — the existing "own
-- invoices"/"own invoice items"/"own clients" owner policies are untouched,
-- and Postgres OR's multiple permissive policies together, so this only
-- ever grants extra access, never revokes any.
--
-- Also grants read-only access to clients, since the invoices list/detail
-- joins client name and contact info — this does NOT grant can_manage_
-- clients-style write access, just enough to display who the invoice is
-- for.

CREATE POLICY "technician manages employer invoices" ON public.invoices FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.technicians t
  WHERE t.auth_user_id = auth.uid()
    AND t.user_id = invoices.user_id
    AND t.can_manage_invoices = true
    AND t.active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.technicians t
  WHERE t.auth_user_id = auth.uid()
    AND t.user_id = invoices.user_id
    AND t.can_manage_invoices = true
    AND t.active = true
));

CREATE POLICY "technician manages employer invoice items" ON public.invoice_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.technicians t ON t.user_id = i.user_id
  WHERE i.id = invoice_items.invoice_id
    AND t.auth_user_id = auth.uid()
    AND t.can_manage_invoices = true
    AND t.active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.technicians t ON t.user_id = i.user_id
  WHERE i.id = invoice_items.invoice_id
    AND t.auth_user_id = auth.uid()
    AND t.can_manage_invoices = true
    AND t.active = true
));

CREATE POLICY "technician views employer clients for invoices" ON public.clients FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.technicians t
  WHERE t.auth_user_id = auth.uid()
    AND t.user_id = clients.user_id
    AND t.can_manage_invoices = true
    AND t.active = true
));
