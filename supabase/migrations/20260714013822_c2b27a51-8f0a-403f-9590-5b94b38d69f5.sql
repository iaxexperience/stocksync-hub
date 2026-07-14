
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS email_integration_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_encryption TEXT DEFAULT 'tls',
  ADD COLUMN IF NOT EXISTS email_template TEXT;

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  payment_method TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view tx" ON public.financial_transactions
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Org members insert tx" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org admins update tx" ON public.financial_transactions
  FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Org admins delete tx" ON public.financial_transactions
  FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE TRIGGER trg_fin_tx_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.profiles(id),
  closed_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'aberto',
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(14,2),
  expected_balance NUMERIC(14,2),
  additions NUMERIC(14,2) NOT NULL DEFAULT 0,
  withdrawals NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register_sessions TO authenticated;
GRANT ALL ON public.cash_register_sessions TO service_role;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view sessions" ON public.cash_register_sessions
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Org members insert sessions" ON public.cash_register_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members update sessions" ON public.cash_register_sessions
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins delete sessions" ON public.cash_register_sessions
  FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE TRIGGER trg_cash_sessions_updated_at
  BEFORE UPDATE ON public.cash_register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
