-- Migration: Create function to register new users from the admin panel without logging out

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
    confirmed_at,
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
    now(),
    '',
    null,
    false,
    null
  ) RETURNING id INTO new_user_id;

  -- 4. Wait, the handle_new_user trigger on auth.users will automatically execute here!
  -- The trigger handle_new_user inserts a profile and a new organization.
  -- Let's find the new organization created by the trigger for this user and store its ID.
  SELECT active_org_id INTO temp_org_id FROM public.profiles WHERE id = new_user_id;

  -- 5. If the trigger successfully ran and created the profile:
  IF temp_org_id IS NOT NULL THEN
    -- Update profile to point to p_org_id instead of the temp organization
    UPDATE public.profiles
    SET active_org_id = p_org_id
    WHERE id = new_user_id;

    -- Update organization_members to point to p_org_id and set the role
    UPDATE public.organization_members
    SET organization_id = p_org_id, role = p_role::public.app_role
    WHERE user_id = new_user_id;

    -- Delete the temp organization that was automatically created by handle_new_user
    DELETE FROM public.organizations WHERE id = temp_org_id;
  ELSE
    -- If trigger didn't run, manually create profile and member
    INSERT INTO public.profiles (id, full_name, email, active_org_id)
    VALUES (new_user_id, p_full_name, p_email, p_org_id);

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_org_id, new_user_id, p_role::public.app_role);
  END IF;

  RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_user_by_admin(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
