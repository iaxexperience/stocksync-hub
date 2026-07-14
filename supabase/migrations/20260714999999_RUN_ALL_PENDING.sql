-- ============================================================================
-- CONSOLIDADO: cole este arquivo inteiro no SQL Editor do Supabase e rode uma
-- única vez. Ele junta as 4 migrations pendentes (verifiquei direto no banco
-- via API: nenhuma delas foi aplicada ainda — por isso force_password_change
-- e get_org_member_profiles não existem e a tela de Usuários quebrou).
-- Todos os comandos são idempotentes (IF NOT EXISTS / CREATE OR REPLACE), então
-- rodar de novo não causa problema mesmo se algum trecho já tiver sido aplicado.
-- ============================================================================

-- ── 1) 20260714040000_force_password_change.sql ─────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.force_password_change(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.organization_members
  WHERE user_id = target_user_id
  LIMIT 1;

  IF v_org_id IS NULL OR NOT public.has_org_role(v_org_id, ARRAY['admin','gerente']::public.app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para forçar a troca de senha deste usuário.';
  END IF;

  UPDATE public.profiles SET must_change_password = true WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_password_change(UUID) TO authenticated;

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

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id::text,
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true, 'full_name', p_full_name),
    'email',
    now(),
    now(),
    now()
  );

  SELECT active_org_id INTO temp_org_id FROM public.profiles WHERE id = new_user_id;

  IF temp_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET active_org_id = p_org_id, must_change_password = true
    WHERE id = new_user_id;

    UPDATE public.organization_members
    SET organization_id = p_org_id, role = p_role::public.app_role
    WHERE user_id = new_user_id;

    DELETE FROM public.organizations WHERE id = temp_org_id;
  ELSE
    INSERT INTO public.profiles (id, full_name, email, active_org_id, must_change_password)
    VALUES (new_user_id, p_full_name, p_email, p_org_id, true)
    ON CONFLICT (id) DO UPDATE SET
      full_name = p_full_name,
      email = p_email,
      active_org_id = p_org_id,
      must_change_password = true;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_org_id, new_user_id, p_role::public.app_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = p_role::public.app_role;
  END IF;

  RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- ── 2) 20260714050000_add_signatures_order_index.sql ────────────────────────
CREATE INDEX IF NOT EXISTS idx_signatures_order ON public.customer_signatures(order_id);

-- ── 3) 20260714060000_harden_search_path.sql ────────────────────────────────
ALTER FUNCTION public.fn_sync_installment_payment_to_finance() SET search_path = public;

-- ── 4) 20260714070000_org_member_profiles_rpc.sql ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_org_member_profiles(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Sem permissão para visualizar os usuários desta organização.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone, p.is_active
  FROM public.profiles p
  JOIN public.organization_members om ON om.user_id = p.id
  WHERE om.organization_id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_member_profiles(UUID) TO authenticated;
