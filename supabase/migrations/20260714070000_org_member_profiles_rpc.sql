-- Fix: the Usuários screen showed "Sem Nome" / blank e-mail for every teammate.
--
-- Root cause: profiles RLS only allows a user to read their OWN row (the
-- "Org members can view teammate profiles" policy that would have allowed
-- this was reverted in 20260714030000 after being suspected of breaking
-- login). Since then, an admin querying `profiles` for OTHER members' ids
-- gets those rows silently filtered out by RLS, so the client-side merge in
-- usuarios.tsx always found an empty profile for teammates.
--
-- Fix: expose a SECURITY DEFINER RPC that returns profile data for members
-- of a given org, gated on the caller actually being a member of that org.
-- This avoids reopening a broad RLS policy on profiles (the thing suspected
-- of breaking login before) while still letting the admin screen show real
-- names/e-mails.
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
