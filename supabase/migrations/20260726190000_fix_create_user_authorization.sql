-- Correção de segurança CRÍTICA: create_new_user_by_admin não validava quem
-- estava chamando, e o privilégio EXECUTE padrão do Postgres (concedido a
-- PUBLIC na criação da função) nunca foi revogado — confirmado ao vivo que
-- o papel "anon" conseguia executá-la. Isso permitia que QUALQUER pessoa
-- com a chave pública do Supabase criasse uma conta 'admin' para qualquer
-- organização, sem estar autenticada.
--
-- Correção: exige auth.uid() válido e has_org_role(p_org_id, 'admin') —
-- mesma regra já usada na UI (usuarios.tsx: só admin vê o formulário) —
-- antes de qualquer escrita, e revoga EXECUTE de PUBLIC/anon.

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT public.has_org_role(p_org_id, ARRAY['admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Apenas administradores desta organização podem criar novos usuários';
  END IF;

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

REVOKE ALL ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- ============================================================
-- Mesma varredura pras outras funções SECURITY DEFINER sensíveis deste
-- projeto — nenhuma delas tinha REVOKE FROM PUBLIC explícito (o padrão do
-- Postgres é conceder EXECUTE a PUBLIC na criação da função). A maioria já
-- se protege sozinha checando auth.uid()/has_org_role no corpo, mas
-- revogar o privilégio bruto é defesa em profundidade — assim uma futura
-- alteração que remova aquele IF por engano não vira um buraco aberto.
-- ============================================================
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'create_new_organization',
        'force_password_change',
        'fn_receive_installment_payment',
        'fn_cancel_installment_payment'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END $$;
