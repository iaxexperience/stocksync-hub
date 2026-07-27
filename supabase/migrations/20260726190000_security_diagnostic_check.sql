-- Diagnóstico somente leitura (RAISE NOTICE) — não altera nada. Usado para
-- confirmar o estado real de RLS/policies/grants antes de escrever a
-- migration de correção de segurança.
DO $$
DECLARE
  t text;
  rls_on boolean;
  pol_count int;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','stock_movements','warehouses','suppliers','categories','brands','units'] LOOP
    SELECT relrowsecurity INTO rls_on FROM pg_class WHERE oid = ('public.'||t)::regclass;
    SELECT count(*) INTO pol_count FROM pg_policies WHERE schemaname='public' AND tablename=t;
    RAISE NOTICE 'TABLE % | rls_enabled=% | policy_count=%', t, rls_on, pol_count;
  END LOOP;

  RAISE NOTICE '--- create_new_user_by_admin grants ---';
  RAISE NOTICE 'anon can execute: %', has_function_privilege('anon', 'public.create_new_user_by_admin(text,text,text,text,uuid)', 'execute');
  RAISE NOTICE 'authenticated can execute: %', has_function_privilege('authenticated', 'public.create_new_user_by_admin(text,text,text,text,uuid)', 'execute');
END $$;
