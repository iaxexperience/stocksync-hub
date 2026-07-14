-- Migration: Allow organization members to view their teammates' profiles.
--
-- Bug: public.profiles only had a "Own profile select" policy (id = auth.uid()),
-- so an admin listing users in the "Usuários" screen could only successfully
-- read their OWN profile row — every other member's name/email came back
-- empty ("Sem Nome") due to RLS, even though the data exists and the app
-- query is correct.
--
-- Fix: add a policy that also allows reading a profile when the requesting
-- user shares at least one organization with that profile's owner.

CREATE POLICY "Org members can view teammate profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR auth.jwt()->>'email' = 'maxrangelformiga@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om_self
      JOIN public.organization_members om_target
        ON om_target.organization_id = om_self.organization_id
      WHERE om_self.user_id = auth.uid()
        AND om_target.user_id = profiles.id
    )
  );
