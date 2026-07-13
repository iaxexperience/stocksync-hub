-- Migration: FINAL FIX - Drop and recreate create_new_user_by_admin without confirmed_at
-- confirmed_at in auth.users is a GENERATED ALWAYS column (computed from email_confirmed_at
-- and phone_confirmed_at). It cannot be set in an INSERT statement.

-- Drop the existing function first to force a clean recreate
DROP FUNCTION IF EXISTS public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID);

-- Recreate extension dependency
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate without confirmed_at in the INSERT
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
  -- 1. Check if user already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Um usuário com este e-mail já existe.';
  END IF;

  -- 2. Generate encrypted password using pgcrypto crypt
  encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 3. Insert user into auth.users table
  -- IMPORTANT: confirmed_at is GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at))
  -- It must NOT be included in the INSERT. It is set automatically based on email_confirmed_at.
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    phone,
    phone_confirmed_at,
    email_change,
    email_change_sent_at,
    is_sso_user,
    deleted_at
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

  -- 4. The handle_new_user trigger fires automatically here.
  -- It inserts a profile and creates a new (temp) organization.
  -- Find the temp organization so we can clean it up.
  SELECT active_org_id INTO temp_org_id FROM public.profiles WHERE id = new_user_id;

  -- 5. Adjust the new user to belong to the correct organization
  IF temp_org_id IS NOT NULL THEN
    -- Point profile to the correct organization
    UPDATE public.profiles
    SET active_org_id = p_org_id
    WHERE id = new_user_id;

    -- Point the membership record to the correct organization and role
    UPDATE public.organization_members
    SET organization_id = p_org_id, role = p_role::public.app_role
    WHERE user_id = new_user_id;

    -- Remove the temp organization created by handle_new_user
    DELETE FROM public.organizations WHERE id = temp_org_id;
  ELSE
    -- Trigger didn't run — create profile and member manually
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
