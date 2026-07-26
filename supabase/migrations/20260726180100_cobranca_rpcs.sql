-- Módulo Cobrança — parte 2/2: RPCs de recebimento/cancelamento de parcela.
--
-- fn_receive_installment_payment é o ÚNICO caminho suportado para registrar
-- um recebimento (integral ou parcial) a partir de agora — tanto o novo
-- módulo Cobrança quanto os diálogos existentes em clientes.tsx passam a
-- chamar esta função via supabase.rpc(...).

CREATE OR REPLACE FUNCTION public.fn_receive_installment_payment(
  p_installment_id uuid,
  p_payment_method text,
  p_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_client_request_id uuid DEFAULT gen_random_uuid()
)
RETURNS public.installment_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_installment public.installments%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_saldo numeric(14,2);
  v_amount numeric(14,2);
  v_new_paid numeric(14,2);
  v_new_status text;
  v_ft_id uuid;
  v_payment public.installment_payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_installment FROM public.installments WHERE id = p_installment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_installment.order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada para esta parcela';
  END IF;

  IF NOT public.has_org_role(v_order.organization_id, ARRAY['admin','gerente','financeiro','vendedor']::public.app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para registrar recebimentos nesta organização';
  END IF;

  IF v_installment.status = 'Cancelado' THEN
    RAISE EXCEPTION 'Parcela cancelada não pode receber pagamento';
  END IF;

  -- Idempotência: se esta mesma tentativa (client_request_id) já foi
  -- processada (ex.: duplo clique), devolve o pagamento já existente em
  -- vez de processar de novo.
  SELECT * INTO v_payment FROM public.installment_payments
  WHERE installment_id = p_installment_id AND client_request_id = p_client_request_id;
  IF FOUND THEN
    RETURN v_payment;
  END IF;

  v_saldo := round(v_installment.amount - v_installment.amount_paid, 2);

  -- p_amount NULL = "Pagamento Integral": o servidor quita o saldo atual,
  -- eliminando qualquer descompasso de saldo desatualizado no cliente.
  v_amount := round(COALESCE(p_amount, v_saldo), 2);

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do recebimento deve ser maior que zero';
  END IF;
  IF v_amount > v_saldo THEN
    RAISE EXCEPTION 'Valor informado (%) é maior que o saldo da parcela (%)', v_amount, v_saldo;
  END IF;

  v_new_paid := v_installment.amount_paid + v_amount;
  v_new_status := CASE WHEN v_new_paid >= v_installment.amount THEN 'Pago' ELSE 'Parcialmente Pago' END;

  INSERT INTO public.financial_transactions
    (organization_id, type, amount, description, category, payment_method, date, reference_id)
  VALUES (
    v_order.organization_id,
    'receita',
    v_amount,
    'Recebimento parcela ' || v_installment.installment_number || ' — Venda ' || v_order.order_number,
    'recebimento_parcela',
    p_payment_method,
    CURRENT_DATE,
    p_installment_id
  )
  RETURNING id INTO v_ft_id;

  UPDATE public.installments
  SET amount_paid = v_new_paid,
      status = v_new_status,
      payment_date = CURRENT_DATE,
      payment_method = p_payment_method
  WHERE id = p_installment_id;

  INSERT INTO public.installment_payments
    (installment_id, organization_id, amount, payment_method, notes, client_request_id, financial_transaction_id, created_by)
  VALUES (p_installment_id, v_order.organization_id, v_amount, p_payment_method, p_notes, p_client_request_id, v_ft_id, auth.uid())
  ON CONFLICT (installment_id, client_request_id) DO NOTHING
  RETURNING * INTO v_payment;

  IF v_payment.id IS NULL THEN
    SELECT * INTO v_payment FROM public.installment_payments
    WHERE installment_id = p_installment_id AND client_request_id = p_client_request_id;
  END IF;

  INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (
    v_order.organization_id, 'installments', p_installment_id, 'recebimento_parcela',
    jsonb_build_object('amount_paid', v_installment.amount_paid, 'status', v_installment.status),
    jsonb_build_object(
      'amount_paid', v_new_paid, 'status', v_new_status, 'amount', v_amount, 'payment_method', p_payment_method,
      'notes', p_notes, 'order_number', v_order.order_number, 'installment_number', v_installment.installment_number
    ),
    auth.uid()
  );

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_receive_installment_payment(uuid, text, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_receive_installment_payment(uuid, text, numeric, text, uuid) TO authenticated;

-- ============================================================
-- Cancelamento de um recebimento — nunca deleta, apenas marca 'cancelado' e
-- lança uma despesa de estorno equivalente no Fluxo de Caixa. Restrito a
-- quem tem permissão financeira (admin/gerente/financeiro).
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cancel_installment_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.installment_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.installment_payments%ROWTYPE;
  v_installment public.installments%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_new_paid numeric(14,2);
  v_new_status text;
  v_reversal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_payment FROM public.installment_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;
  IF v_payment.status = 'cancelado' THEN
    RAISE EXCEPTION 'Este pagamento já foi cancelado';
  END IF;

  IF NOT public.has_org_role(v_payment.organization_id, ARRAY['admin','gerente','financeiro']::public.app_role[]) THEN
    RAISE EXCEPTION 'Apenas usuários com permissão financeira podem cancelar recebimentos';
  END IF;

  SELECT * INTO v_installment FROM public.installments WHERE id = v_payment.installment_id FOR UPDATE;
  SELECT * INTO v_order FROM public.orders WHERE id = v_installment.order_id;

  v_new_paid := GREATEST(round(v_installment.amount_paid - v_payment.amount, 2), 0);
  v_new_status := CASE
    WHEN v_new_paid <= 0 THEN 'Pendente'
    WHEN v_new_paid >= v_installment.amount THEN 'Pago'
    ELSE 'Parcialmente Pago'
  END;

  INSERT INTO public.financial_transactions
    (organization_id, type, amount, description, category, payment_method, date, reference_id)
  VALUES (
    v_order.organization_id,
    'despesa',
    v_payment.amount,
    'Estorno recebimento parcela ' || v_installment.installment_number || ' — Venda ' || v_order.order_number,
    'estorno_recebimento',
    v_payment.payment_method,
    CURRENT_DATE,
    v_payment.installment_id
  )
  RETURNING id INTO v_reversal_id;

  UPDATE public.installments
  SET amount_paid = v_new_paid, status = v_new_status
  WHERE id = v_installment.id;

  UPDATE public.installment_payments
  SET status = 'cancelado', cancelled_at = now(), cancelled_by = auth.uid(),
      cancellation_reason = p_reason, reversal_transaction_id = v_reversal_id
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (
    v_order.organization_id, 'installment_payments', p_payment_id, 'cancelamento_recebimento',
    jsonb_build_object('status', 'ativo', 'amount', v_payment.amount),
    jsonb_build_object('status', 'cancelado', 'reason', p_reason, 'order_number', v_order.order_number),
    auth.uid()
  );

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cancel_installment_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_cancel_installment_payment(uuid, text) TO authenticated;

-- ============================================================
-- Rede de segurança: se qualquer código (atual ou futuro, ou uma edição
-- manual no SQL editor) marcar uma parcela como 'Pago' por fora das RPCs
-- acima, preenche amount_paid automaticamente E registra em audit_logs que
-- isso aconteceu fora do fluxo oficial — nunca falha silenciosamente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_installment_payment_safety_net()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NEW.status = 'Pago' AND NEW.amount_paid < NEW.amount THEN
    NEW.amount_paid := NEW.amount;

    SELECT organization_id INTO v_org_id FROM public.orders WHERE id = NEW.order_id;
    INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (
      v_org_id, 'installments', NEW.id, 'recebimento_fora_do_fluxo',
      jsonb_build_object('amount_paid', OLD.amount_paid),
      jsonb_build_object('amount', NEW.amount, 'amount_paid', NEW.amount_paid, 'note', 'status Pago definido sem passar pela RPC de recebimento'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_installment_payment_safety_net ON public.installments;
CREATE TRIGGER trg_installment_payment_safety_net
  BEFORE UPDATE OF status ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.tg_installment_payment_safety_net();
