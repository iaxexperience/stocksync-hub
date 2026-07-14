-- Performance: the RLS policy on customer_signatures joins through orders via
-- order_id (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND ...)),
-- but order_id had no index — every signatures SELECT was doing a sequential
-- scan for that check. customer_id already had an index; this covers the
-- other join path.
CREATE INDEX IF NOT EXISTS idx_signatures_order ON public.customer_signatures(order_id);
