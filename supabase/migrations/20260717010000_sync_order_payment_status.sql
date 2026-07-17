-- Regra: quando todas as parcelas de um pedido estão "Pago", o próprio pedido
-- deve refletir isso (Status Venda = Concluído, Status Pag. = Pago) em vez de
-- ficar preso em "Pendente"/"Pendente" para sempre. Hoje isso só era setado
-- manualmente na edição do pedido, nunca sincronizado a partir das parcelas.

-- 1) Backfill: corrige pedidos que já estão totalmente pagos hoje.
UPDATE public.orders o
SET payment_status = 'Pago',
    status = CASE WHEN o.status = 'Cancelado' THEN o.status ELSE 'Concluído' END
WHERE EXISTS (SELECT 1 FROM public.installments i WHERE i.order_id = o.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.installments i WHERE i.order_id = o.id AND i.status <> 'Pago'
  )
  AND o.payment_status <> 'Pago';

-- 2) Regra daqui pra frente: toda vez que uma parcela é inserida/atualizada,
--    reavalia se o pedido inteiro já está pago.
CREATE OR REPLACE FUNCTION public.tg_sync_order_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all_paid BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.installments WHERE order_id = NEW.order_id AND status <> 'Pago'
  ) INTO v_all_paid;

  IF v_all_paid THEN
    UPDATE public.orders
    SET payment_status = 'Pago',
        status = CASE WHEN status = 'Cancelado' THEN status ELSE 'Concluído' END
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_payment_status ON public.installments;
CREATE TRIGGER trg_sync_order_payment_status
AFTER INSERT OR UPDATE OF status ON public.installments
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_order_payment_status();
