-- Verificação somente leitura (RAISE NOTICE) — confirma que o anon perdeu
-- acesso à função depois da correção.
DO $$
BEGIN
  RAISE NOTICE 'anon can execute create_new_user_by_admin: %',
    has_function_privilege('anon', 'public.create_new_user_by_admin(text,text,text,text,uuid)', 'execute');
  RAISE NOTICE 'authenticated can execute create_new_user_by_admin: %',
    has_function_privilege('authenticated', 'public.create_new_user_by_admin(text,text,text,text,uuid)', 'execute');
END $$;
