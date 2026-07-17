-- Bug: excluir uma parcela deveria apagar a assinatura/contrato digital do
-- mesmo pedido (feature pedida pelo usuário), mas a política de DELETE em
-- customer_signatures não está efetivamente ativa no banco — o DELETE do
-- app roda sem erro mas afeta 0 linhas (RLS filtra silenciosamente).
--
-- Reforça (idempotente, via DROP + CREATE) as políticas de DELETE tanto em
-- customer_signatures quanto em installments, para garantir que qualquer
-- membro da organização consiga excluir os dois.
DROP POLICY IF EXISTS "org delete signatures" ON public.customer_signatures;
DROP POLICY IF EXISTS "customer_signatures org delete" ON public.customer_signatures;
CREATE POLICY "customer_signatures org delete" ON public.customer_signatures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));

DROP POLICY IF EXISTS "org delete installments" ON public.installments;
DROP POLICY IF EXISTS "installments org delete" ON public.installments;
CREATE POLICY "installments org delete" ON public.installments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
