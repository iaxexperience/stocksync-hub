-- Security hardening: pin search_path on the one SECURITY DEFINER function
-- that was missing it. Every other SECURITY DEFINER function in this project
-- already sets SET search_path explicitly; without it, a SECURITY DEFINER
-- function is exposed to search_path hijacking (an attacker-controlled
-- search_path could make unqualified identifiers resolve to attacker objects,
-- escalating to the function definer's privileges). This function's body
-- already only references schema-qualified tables (public.orders,
-- public.financial_transactions), so it isn't currently exploitable — this is
-- defense-in-depth to close the gap and match the rest of the codebase.
ALTER FUNCTION public.fn_sync_installment_payment_to_finance() SET search_path = public;
