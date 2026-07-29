CREATE OR REPLACE FUNCTION public.fn_debug_stock_triggers()
RETURNS TABLE(trigger_name text, table_name text, trigger_def text, func_def text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.tgname::text,
         c.relname::text,
         pg_get_triggerdef(t.oid),
         pg_get_functiondef(p.oid)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE c.relname = 'stock_movements' AND NOT t.tgisinternal;
$$;
GRANT EXECUTE ON FUNCTION public.fn_debug_stock_triggers() TO authenticated;
