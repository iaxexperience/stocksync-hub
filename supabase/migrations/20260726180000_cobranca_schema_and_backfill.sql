-- Módulo Cobrança — parte 1/2: schema aditivo + backfill defensivo.
--
-- Este repositório tem um histórico de migrations aplicadas fora de ordem /
-- nunca aplicadas (ver 20260714999999_RUN_ALL_PENDING.sql). Por isso este
-- arquivo nunca assume o estado anterior do banco: descobre triggers e
-- constraints dinamicamente antes de alterá-los, e todo DDL é idempotente
-- (pode ser rodado mais de uma vez sem efeito colateral).

-- ============================================================
-- 1. Remove o gatilho antigo de sincronização financeira (se existir).
--    Ele lançava sempre o valor CHEIO da parcela ao marcá-la 'Pago',
--    sem suportar pagamento parcial nem estorno — será substituído pelas
--    RPCs fn_receive_installment_payment / fn_cancel_installment_payment
--    (ver 20260726180100_cobranca_rpcs.sql), que são as únicas responsáveis
--    por lançar em financial_transactions a partir de agora.
-- ============================================================
DROP TRIGGER IF EXISTS trg_after_installment_payment ON public.installments;
DROP FUNCTION IF EXISTS public.fn_sync_installment_payment_to_finance();

-- ============================================================
-- 2. Remove temporariamente o gatilho de sincronização de status do pedido
--    (será recriado, mais seguro, no passo 8) para que o backfill do passo 6
--    não dispare recomputos com dados ainda incompletos.
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_order_payment_status ON public.installments;
DROP FUNCTION IF EXISTS public.tg_sync_order_payment_status();

-- ============================================================
-- 3. Coluna de valor pago acumulado por parcela.
-- ============================================================
ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS amount_paid numeric(14,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 4. Descobre e remove qualquer CHECK constraint existente sobre a coluna
--    status de installments (nome desconhecido/variável entre ambientes),
--    depois recria com o vocabulário completo, preservando 'Atrasado'
--    (já usado hoje em src/routes/_authenticated/clientes.tsx).
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.installments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.installments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- NOT VALID: adiciona a regra sem varrer/validar as linhas já existentes.
-- Se algum registro histórico tiver um status fora do esperado (já vimos
-- valores inesperados noutras tabelas deste banco), uma constraint validada
-- na hora derrubaria a transação inteira — incluindo o ADD COLUMN acima.
-- A regra passa a valer normalmente para todo INSERT/UPDATE novo mesmo assim.
ALTER TABLE public.installments
  ADD CONSTRAINT installments_status_check
  CHECK (status IN ('Pendente', 'Parcialmente Pago', 'Pago', 'Atrasado', 'Cancelado')) NOT VALID;

-- ============================================================
-- 5. Nunca permitir valor pago negativo ou maior que o valor da parcela.
--    Esta é a garantia real de "nunca receber mais que o saldo" — a RPC
--    também valida, mas a constraint vale mesmo para qualquer escrita futura.
--    Também NOT VALID pelo mesmo motivo acima.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.installments'::regclass AND conname = 'installments_amount_paid_check'
  ) THEN
    ALTER TABLE public.installments
      ADD CONSTRAINT installments_amount_paid_check
      CHECK (amount_paid >= 0 AND amount_paid <= amount) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 6. Backfill: parcelas já marcadas 'Pago' historicamente não podem ficar
--    com saldo aberto fantasma.
-- ============================================================
UPDATE public.installments
SET amount_paid = amount
WHERE status = 'Pago' AND amount_paid <> amount;

-- ============================================================
-- 7. Histórico imutável de recebimentos por parcela.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  client_request_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado')),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancellation_reason text,
  financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  reversal_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  -- Nullable: pagamentos novos (via RPC) sempre preenchem com auth.uid();
  -- o backfill sintético de pagamentos históricos (abaixo) não tem um
  -- usuário real associado, então fica NULL nesses casos.
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installment_id, client_request_id)
);

ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installment_payments_select" ON public.installment_payments;
CREATE POLICY "installment_payments_select" ON public.installment_payments
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "installment_payments_insert" ON public.installment_payments;
CREATE POLICY "installment_payments_insert" ON public.installment_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

-- Nunca apagar/editar recebimentos por fora das RPCs: sem policy de
-- UPDATE/DELETE para authenticated, e revoga o privilégio bruto também —
-- assim "nunca apagar registros" é garantido mesmo que alguém crie uma
-- policy futura por engano. As RPCs (SECURITY DEFINER) continuam podendo
-- escrever porque rodam como dono da função, não como "authenticated".
REVOKE UPDATE, DELETE ON public.installment_payments FROM authenticated;
GRANT SELECT, INSERT ON public.installment_payments TO authenticated;

CREATE INDEX IF NOT EXISTS idx_installment_payments_installment ON public.installment_payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_org_payment_date ON public.installment_payments(organization_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_org_created ON public.installment_payments(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status_due_date ON public.installments(status, due_date);

-- Backfill sintético: uma linha de histórico para cada parcela já paga
-- antes da existência deste módulo, para o Histórico nunca aparecer vazio.
-- created_by fica NULL — não há um usuário real associado a esse
-- recebimento histórico (orders não tem coluna created_by).
INSERT INTO public.installment_payments
  (installment_id, organization_id, amount, payment_method, payment_date, notes, client_request_id, created_by, created_at)
SELECT
  i.id,
  o.organization_id,
  i.amount,
  COALESCE(i.payment_method, 'Outros'),
  COALESCE(i.payment_date, i.due_date),
  'Migração — recebimento anterior ao módulo de Cobrança',
  gen_random_uuid(),
  NULL,
  COALESCE(i.created_at, now())
FROM public.installments i
JOIN public.orders o ON o.id = i.order_id
WHERE i.status = 'Pago'
  AND i.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.installment_payments ip WHERE ip.installment_id = i.id);

-- ============================================================
-- 8. Recria a sincronização de status do pedido — agora bidirecional
--    (promove E rebaixa), nunca destrutiva de estados intermediários,
--    e nunca escreve 'Inadimplente' (é derivado de data, não de evento).
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_sync_order_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_new_payment_status text;
  v_current_status text;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(amount_paid), 0)
  INTO v_total, v_paid
  FROM public.installments
  WHERE order_id = v_order_id;

  SELECT status INTO v_current_status FROM public.orders WHERE id = v_order_id;
  IF v_current_status = 'Cancelado' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_total > 0 AND v_paid >= v_total THEN
    v_new_payment_status := 'Pago';
  ELSIF v_paid > 0 THEN
    v_new_payment_status := 'Parcialmente Pago';
  ELSE
    v_new_payment_status := 'Pendente';
  END IF;

  UPDATE public.orders
  SET payment_status = v_new_payment_status,
      status = CASE
        WHEN v_new_payment_status = 'Pago' THEN 'Concluído'
        WHEN status = 'Concluído' THEN 'Aprovado'
        ELSE status
      END,
      updated_at = now()
  WHERE id = v_order_id
    AND payment_status IS DISTINCT FROM v_new_payment_status;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_order_payment_status
  AFTER INSERT OR DELETE OR UPDATE OF status, amount_paid, amount ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_order_payment_status();

-- ============================================================
-- 9. Re-backfill direto de orders.payment_status usando a mesma regra do
--    trigger (feito em SQL puro, não via trigger, porque UPDATE ... SET
--    updated_at não dispara o trigger acima — ele só escuta status/
--    amount_paid/amount). Ordem importa: isso roda DEPOIS do trigger novo
--    existir, nunca antes, para não corromper pedidos já concluídos.
-- ============================================================
WITH totals AS (
  SELECT order_id, COALESCE(SUM(amount), 0) AS total, COALESCE(SUM(amount_paid), 0) AS paid
  FROM public.installments
  GROUP BY order_id
)
UPDATE public.orders o
SET payment_status = CASE
      WHEN t.total > 0 AND t.paid >= t.total THEN 'Pago'
      WHEN t.paid > 0 THEN 'Parcialmente Pago'
      ELSE 'Pendente'
    END,
    status = CASE
      WHEN t.total > 0 AND t.paid >= t.total THEN 'Concluído'
      WHEN o.status = 'Concluído' THEN 'Aprovado'
      ELSE o.status
    END,
    updated_at = now()
FROM totals t
WHERE t.order_id = o.id
  AND o.status <> 'Cancelado'
  AND o.payment_status IS DISTINCT FROM (CASE
      WHEN t.total > 0 AND t.paid >= t.total THEN 'Pago'
      WHEN t.paid > 0 THEN 'Parcialmente Pago'
      ELSE 'Pendente'
    END);
