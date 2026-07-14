-- Migration: Catch-up script consolidating everything that was written in prior
-- migration files but never actually applied to the live database (the
-- auto-apply pipeline appears to have stopped working at some point).
--
-- This closes the gap for: organizations.address, organization_settings
-- (colors/logo/LGPD/WhatsApp/e-mail/inactivity settings), financial_transactions
-- + cash_register_sessions (Financeiro & Caixa), create_new_organization RPC
-- (multi-empresa), and the corrected create_new_user_by_admin RPC (fixes the
-- "cannot insert a non-DEFAULT value into column confirmed_at" error).
--
-- Safe to run once against the current live schema. Every statement is
-- idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS first).

-- ============================================================
-- 1. organizations.address
-- ============================================================
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address text;

-- ============================================================
-- 2. organization_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  lgpd_consent_text TEXT DEFAULT 'Declaro que li e aceito as Políticas de Privacidade e autorizo o tratamento dos meus dados pessoais...',
  lgpd_cookies_enabled BOOLEAN DEFAULT true,
  lgpd_data_deletion_instructions TEXT DEFAULT 'Para solicitar a exclusão de seus dados, envie um e-mail para dpo@suaempresa.com',
  primary_color TEXT DEFAULT '#4f46e5',
  secondary_color TEXT DEFAULT '#0f172a',
  company_logo_url TEXT DEFAULT '',
  inactivity_timeout_minutes INTEGER DEFAULT 15,
  inactivity_action TEXT DEFAULT 'logout',
  email_integration_enabled BOOLEAN DEFAULT false,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_encryption TEXT DEFAULT 'tls',
  email_template TEXT DEFAULT 'Olá {nome_cliente}, segue o link do seu contrato digital #{numero_contrato}: {link_contrato}',
  whatsapp_integration_enabled BOOLEAN DEFAULT false,
  whatsapp_template TEXT DEFAULT 'Olá {nome_cliente}, seu contrato digital #{numero_contrato} do StockFlow foi assinado com sucesso!',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;

DROP POLICY IF EXISTS "org read settings" ON public.organization_settings;
CREATE POLICY "org read settings" ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org insert settings" ON public.organization_settings;
CREATE POLICY "org insert settings" ON public.organization_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org update settings" ON public.organization_settings;
CREATE POLICY "org update settings" ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org delete settings" ON public.organization_settings;
CREATE POLICY "org delete settings" ON public.organization_settings FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

DROP TRIGGER IF EXISTS trg_organization_settings_updated_at ON public.organization_settings;
CREATE TRIGGER trg_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- WhatsApp Meta Cloud API columns
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_template_name TEXT DEFAULT 'hello_world',
  ADD COLUMN IF NOT EXISTS whatsapp_integration_type TEXT DEFAULT 'link';

-- ============================================================
-- 3. RLS helper redefinitions + create_new_organization RPC (multi-empresa)
--    (depends on organization_settings existing, above)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.jwt()->>'email' = 'maxrangelformiga@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.jwt()->>'email' = 'maxrangelformiga@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.jwt()->>'email' = 'maxrangelformiga@gmail.com' THEN
    RETURN QUERY SELECT id FROM public.organizations;
  ELSE
    RETURN QUERY SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_new_organization(
  org_name TEXT,
  org_document TEXT DEFAULT NULL,
  org_phone TEXT DEFAULT NULL,
  org_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  INSERT INTO public.organizations (name, document, phone, email)
  VALUES (org_name, org_document, org_phone, org_email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'admin');

  UPDATE public.profiles
  SET active_org_id = new_org_id
  WHERE id = current_user_id;

  INSERT INTO public.warehouses (organization_id, name, is_main)
  VALUES (new_org_id, 'Depósito Principal', true);

  INSERT INTO public.units (organization_id, name, abbreviation) VALUES
    (new_org_id, 'Unidade', 'UN'),
    (new_org_id, 'Caixa', 'CX'),
    (new_org_id, 'Quilograma', 'KG'),
    (new_org_id, 'Litro', 'L'),
    (new_org_id, 'Metro', 'M');

  INSERT INTO public.categories (organization_id, name) VALUES
    (new_org_id, 'Materiais'),
    (new_org_id, 'Eletrodomésticos'),
    (new_org_id, 'Equipamentos'),
    (new_org_id, 'Consumíveis');

  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id);

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_organization(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 4. financial_transactions + cash_register_sessions (Financeiro & Caixa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register_sessions TO authenticated;
GRANT ALL ON public.cash_register_sessions TO service_role;

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

CREATE OR REPLACE FUNCTION public.fn_sync_installment_payment_to_finance()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_order_num TEXT;
BEGIN
  SELECT organization_id, order_number INTO v_org_id, v_order_num
  FROM public.orders
  WHERE id = NEW.order_id;

  IF NEW.status = 'Pago' AND (OLD.status IS NULL OR OLD.status != 'Pago') THEN
    INSERT INTO public.financial_transactions (
      organization_id, type, amount, description, category, payment_method, date, reference_id
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

DROP TRIGGER IF EXISTS trg_after_installment_payment ON public.installments;
CREATE TRIGGER trg_after_installment_payment
  AFTER UPDATE ON public.installments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_installment_payment_to_finance();

-- ============================================================
-- 5. create_new_user_by_admin — final corrected version
--    (fixes: cannot insert a non-DEFAULT value into column "confirmed_at")
-- ============================================================
DROP FUNCTION IF EXISTS public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_new_user_by_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_org_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
  temp_org_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Um usuário com este e-mail já existe.';
  END IF;

  encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- NOTE: confirmed_at is GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at))
  -- and must NOT be included in this INSERT.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin,
    phone, phone_confirmed_at, email_change, email_change_sent_at, is_sso_user, deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('full_name', p_full_name)::jsonb,
    now(),
    now(),
    false,
    null,
    null,
    '',
    null,
    false,
    null
  ) RETURNING id INTO new_user_id;

  SELECT active_org_id INTO temp_org_id FROM public.profiles WHERE id = new_user_id;

  IF temp_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET active_org_id = p_org_id
    WHERE id = new_user_id;

    UPDATE public.organization_members
    SET organization_id = p_org_id, role = p_role::public.app_role
    WHERE user_id = new_user_id;

    DELETE FROM public.organizations WHERE id = temp_org_id;
  ELSE
    INSERT INTO public.profiles (id, full_name, email, active_org_id)
    VALUES (new_user_id, p_full_name, p_email, p_org_id)
    ON CONFLICT (id) DO UPDATE SET full_name = p_full_name, email = p_email, active_org_id = p_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_org_id, new_user_id, p_role::public.app_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = p_role::public.app_role;
  END IF;

  RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
