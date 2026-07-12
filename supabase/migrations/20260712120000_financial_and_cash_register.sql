-- Migration: Create financial_transactions and cash_register_sessions tables

-- Table: financial_transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'venda', 'suprimento', 'sangria', 'aluguel', 'salário', 'fornecedores', 'impostos', 'outros'
  payment_method TEXT NOT NULL, -- 'Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência bancária'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id UUID, -- optionally links to installment_id or order_id
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: cash_register_sessions
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('aberto', 'fechado')) DEFAULT 'aberto',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  closing_balance NUMERIC(15,2),
  additions NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  withdrawals NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register_sessions TO authenticated;
GRANT ALL ON public.cash_register_sessions TO service_role;

-- Policies for financial_transactions
DROP POLICY IF EXISTS "org read transactions" ON public.financial_transactions;
CREATE POLICY "org read transactions" ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org insert transactions" ON public.financial_transactions;
CREATE POLICY "org insert transactions" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org update transactions" ON public.financial_transactions;
CREATE POLICY "org update transactions" ON public.financial_transactions FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org delete transactions" ON public.financial_transactions;
CREATE POLICY "org delete transactions" ON public.financial_transactions FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- Policies for cash_register_sessions
DROP POLICY IF EXISTS "org read cash sessions" ON public.cash_register_sessions;
CREATE POLICY "org read cash sessions" ON public.cash_register_sessions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org insert cash sessions" ON public.cash_register_sessions;
CREATE POLICY "org insert cash sessions" ON public.cash_register_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org update cash sessions" ON public.cash_register_sessions;
CREATE POLICY "org update cash sessions" ON public.cash_register_sessions FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org delete cash sessions" ON public.cash_register_sessions;
CREATE POLICY "org delete cash sessions" ON public.cash_register_sessions FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- Trigger function to sync installment payments to cash flow (financial_transactions)
CREATE OR REPLACE FUNCTION public.fn_sync_installment_payment_to_finance()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_order_num TEXT;
BEGIN
  -- Get the organization ID and order number from the orders table
  SELECT organization_id, order_number INTO v_org_id, v_order_num
  FROM public.orders 
  WHERE id = NEW.order_id;
  
  IF NEW.status = 'Pago' AND (OLD.status IS NULL OR OLD.status != 'Pago') THEN
    INSERT INTO public.financial_transactions (
      organization_id,
      type,
      amount,
      description,
      category,
      payment_method,
      date,
      reference_id
    ) VALUES (
      v_org_id,
      'receita',
      NEW.amount,
      'Recebimento da parcela ' || NEW.installment_number || ' do contrato #' || COALESCE(v_order_num, NEW.order_id::text),
      'venda',
      COALESCE(NEW.payment_method, 'Pix'),
      COALESCE(NEW.payment_date, CURRENT_DATE),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: trg_after_installment_payment
DROP TRIGGER IF EXISTS trg_after_installment_payment ON public.installments;
CREATE TRIGGER trg_after_installment_payment
  AFTER UPDATE ON public.installments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_installment_payment_to_finance();
