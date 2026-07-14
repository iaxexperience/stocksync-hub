-- Migration: Fix create_new_user_by_admin — missing auth.identities row.
--
-- Bug: the function only inserted into auth.users, never into auth.identities.
-- Supabase Auth (GoTrue) requires a matching identities row (provider='email')
-- for email/password sign-in to work; without it, GoTrue's own user lookup
-- errors out ("Database error loading user" / "Database error finding users")
-- and login always fails with "E-mail ou senha incorretos".
--
-- This also cleans up the one user already created with the broken function
-- (jjjoferraz@hotmail.com) so it can be removed and re-created cleanly.

-- 1. Clean up the broken user created before this fix.
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jjjoferraz@hotmail.com';
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM public.organization_members WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END;
$$;

-- 2. Recreate create_new_user_by_admin, now also inserting the auth.identities row.
DROP FUNCTION IF EXISTS public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID);

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

  -- NOTE: identities.email is a GENERATED column (from identity_data->>'email')
  -- and must NOT be included in this INSERT either.
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
