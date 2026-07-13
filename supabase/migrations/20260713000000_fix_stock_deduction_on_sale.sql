-- Migration: Fix stock deduction on sale.
--
-- Bug: order_items are always inserted right after orders is created, while
-- status is still 'Pendente' — so tg_handle_order_item_stock() never fired,
-- and signing a contract afterwards did not retroactively create the exit
-- movements either. Net effect: stock was never deducted for 'pedido' nor
-- 'contrato' sales.
--
-- Fix: a 'pedido' is an immediate, already-closed sale, so its items must
-- deduct stock right away regardless of status. A 'contrato' only deducts
-- once the customer signature is collected (order approved). A helper
-- function backfills any pending item without a matching exit movement,
-- and is called both from the signature trigger and from an orders status
-- trigger (covers manual status edits, e.g. from the admin "editar pedido").

-- 1. Helper: create missing 'saida' stock movements for every item of an order.
CREATE OR REPLACE FUNCTION public.fn_create_stock_exits_for_order(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_number TEXT;
  v_organization_id UUID;
  v_seller_id UUID;
  v_item RECORD;
BEGIN
  SELECT order_number, organization_id, seller_id
  INTO v_order_number, v_organization_id, v_seller_id
  FROM public.orders WHERE id = p_order_id;

  IF v_organization_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT product_id, quantity, unit_price FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE reference = p_order_id::text AND product_id = v_item.product_id AND movement_type = 'saida'
    ) THEN
      INSERT INTO public.stock_movements (organization_id, product_id, movement_type, quantity, unit_cost, reason, reference, created_by)
      VALUES (v_organization_id, v_item.product_id, 'saida', v_item.quantity, v_item.unit_price, 'Venda - Pedido #' || v_order_number, p_order_id::text, v_seller_id);
    END IF;
  END LOOP;
END;
$$;

-- 2. order_items: deduct immediately for 'pedido' (closed sale), or when the
--    parent order is already Aprovado/Concluído (kept for the edge case of
--    adding items to an already-approved order).
CREATE OR REPLACE FUNCTION public.tg_handle_order_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_order_type TEXT;
  v_order_number TEXT;
  v_organization_id UUID;
  v_seller_id UUID;
BEGIN
  SELECT status, order_type, order_number, organization_id, seller_id
  INTO v_status, v_order_type, v_order_number, v_organization_id, v_seller_id
  FROM public.orders WHERE id = NEW.order_id;

  IF v_order_type = 'pedido' OR v_status IN ('Aprovado', 'Concluído') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE reference = NEW.order_id::text AND product_id = NEW.product_id AND movement_type = 'saida'
    ) THEN
      INSERT INTO public.stock_movements (organization_id, product_id, movement_type, quantity, unit_cost, reason, reference, created_by)
      VALUES (v_organization_id, NEW.product_id, 'saida', NEW.quantity, NEW.unit_price, 'Venda - Pedido #' || v_order_number, NEW.order_id::text, v_seller_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_order_item_stock_trigger ON public.order_items;
CREATE TRIGGER handle_order_item_stock_trigger
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.tg_handle_order_item_stock();

-- 3. customer_signatures: on top of approving the order, backfill stock
--    exits for a contract's items (they were skipped at insert time since
--    the order was still 'Pendente').
CREATE OR REPLACE FUNCTION public.tg_approve_order_on_signature()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'Aprovado'
    WHERE id = NEW.order_id AND status = 'Pendente';

    PERFORM public.fn_create_stock_exits_for_order(NEW.order_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approve_order_on_signature_trigger ON public.customer_signatures;
CREATE TRIGGER approve_order_on_signature_trigger
AFTER INSERT ON public.customer_signatures
FOR EACH ROW EXECUTE FUNCTION public.tg_approve_order_on_signature();

-- 4. orders: safety net for manual status edits (e.g. admin sets status to
--    'Aprovado'/'Concluído' by hand) — backfill any pending stock exits.
CREATE OR REPLACE FUNCTION public.tg_handle_order_status_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('Aprovado', 'Concluído') AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.fn_create_stock_exits_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_order_status_stock_trigger ON public.orders;
CREATE TRIGGER handle_order_status_stock_trigger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_handle_order_status_stock();
