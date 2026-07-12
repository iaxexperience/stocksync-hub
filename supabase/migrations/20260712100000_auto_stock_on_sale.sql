-- Migration: Automate stock deduction when products are sold

-- 1. Trigger to automatically change order status to 'Aprovado' when a signature is saved
CREATE OR REPLACE FUNCTION public.tg_approve_order_on_signature()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'Aprovado'
    WHERE id = NEW.order_id AND status = 'Pendente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approve_order_on_signature_trigger ON public.customer_signatures;
CREATE TRIGGER approve_order_on_signature_trigger
AFTER INSERT ON public.customer_signatures
FOR EACH ROW EXECUTE FUNCTION public.tg_approve_order_on_signature();


-- 2. Trigger to automatically create stock movements when order items are inserted into an already approved/completed order
CREATE OR REPLACE FUNCTION public.tg_handle_order_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_order_number TEXT;
  v_organization_id UUID;
  v_seller_id UUID;
BEGIN
  SELECT status, order_number, organization_id, seller_id 
  INTO v_status, v_order_number, v_organization_id, v_seller_id
  FROM public.orders WHERE id = NEW.order_id;

  IF v_status IN ('Aprovado', 'Concluído') THEN
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
