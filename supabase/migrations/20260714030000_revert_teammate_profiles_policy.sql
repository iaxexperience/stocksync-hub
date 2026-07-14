-- Migration: Revert "Org members can view teammate profiles" policy on public.profiles.
-- Suspected of interfering with login after being added; rolling back to the
-- original single policy (each user can only read their own profile row).

DROP POLICY IF EXISTS "Org members can view teammate profiles" ON public.profiles;
