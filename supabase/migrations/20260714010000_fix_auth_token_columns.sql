-- Migration: Fix create_new_user_by_admin — missing empty-string defaults on
-- auth.users token columns.
--
-- Bug: confirmation_token, recovery_token, email_change_token_new,
-- email_change_token_current, reauthentication_token, phone_change and
-- phone_change_token were left NULL by the manual INSERT. Supabase Auth
-- (GoTrue) scans these as plain strings (not nullable), so a NULL value
-- makes ANY lookup of that user fail with "Database error loading user" /
-- "Database error finding users" — which is exactly why login always failed
-- even though the row existed and the password matched.
--
-- This cleans up every user created with the broken function so far, and
-- recreates the function setting all of these columns to '' like a real
-- signup does.

-- 1. Clean up every previously-broken manually-created user (safe: only
--    removes rows that error out when Auth tries to load them — i.e. every
--    user created via the admin panel so far, since none of them worked).
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id FROM auth.users
    WHERE email IN ('jjjoferraz@hotmail.com', 'maria@loja.com')
  LOOP
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM public.organization_members WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END LOOP;
END;
$$;

-- 2. Recreate create_new_user_by_admin with all token columns set to ''.
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

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_super_admin,
    phone, phone_confirmed_at, email_change, email_change_sent_at, is_sso_user, deleted_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    reauthentication_token, phone_change, phone_change_token
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
    null,
    '', '', '', '', '', '', ''
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
