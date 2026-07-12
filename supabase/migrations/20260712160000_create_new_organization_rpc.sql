-- Migration: Create create_new_organization function and update RLS helper functions for maxrangelformiga@gmail.com global access

-- 1. Redefine is_org_member to allow maxrangelformiga@gmail.com global access
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if current user is the global admin
  IF auth.jwt()->>'email' = 'maxrangelformiga@gmail.com' THEN
    RETURN TRUE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
END;
$$;

-- 2. Redefine has_org_role to allow maxrangelformiga@gmail.com global access
CREATE OR REPLACE FUNCTION public.has_org_role(_org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if current user is the global admin
  IF auth.jwt()->>'email' = 'maxrangelformiga@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles)
  );
END;
$$;

-- 3. Redefine user_org_ids to return all organizations for maxrangelformiga@gmail.com
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

-- 4. Create the create_new_organization RPC function
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
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 1. Insert the new organization
  INSERT INTO public.organizations (name, document, phone, email)
  VALUES (org_name, org_document, org_phone, org_email)
  RETURNING id INTO new_org_id;

  -- 2. Add the user as an admin member of the new organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'admin');

  -- 3. Update the user's active organization ID in their profile
  UPDATE public.profiles
  SET active_org_id = new_org_id
  WHERE id = current_user_id;

  -- 4. Create default warehouse
  INSERT INTO public.warehouses (organization_id, name, is_main)
  VALUES (new_org_id, 'Depósito Principal', true);

  -- 5. Create default units
  INSERT INTO public.units (organization_id, name, abbreviation) VALUES
    (new_org_id, 'Unidade', 'UN'),
    (new_org_id, 'Caixa', 'CX'),
    (new_org_id, 'Quilograma', 'KG'),
    (new_org_id, 'Litro', 'L'),
    (new_org_id, 'Metro', 'M');

  -- 6. Create default categories
  INSERT INTO public.categories (organization_id, name) VALUES
    (new_org_id, 'Materiais'),
    (new_org_id, 'Eletrodomésticos'),
    (new_org_id, 'Equipamentos'),
    (new_org_id, 'Consumíveis');

  -- 7. Create default settings
  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id);

  RETURN new_org_id;
END;
$$;
