-- A migration 20260712090000_update_stock_movement_trigger.sql nunca foi
-- efetivamente aplicada no banco ao vivo (o trigger continuava só com
-- AFTER INSERT, sem tratar UPDATE/DELETE) — confirmado via introspecção
-- direta (pg_get_triggerdef). Isso deixava "Excluir"/"Editar movimentação"
-- em Movimentações sem nenhum efeito sobre products.stock_current, e
-- quebrava a devolução de estoque ao excluir uma Avaria. Reaplicando aqui.

CREATE OR REPLACE FUNCTION public.tg_apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  old_delta NUMERIC := 0;
  new_delta NUMERIC := 0;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF OLD.movement_type = 'entrada' THEN old_delta := OLD.quantity;
    ELSIF OLD.movement_type = 'saida' THEN old_delta := -OLD.quantity;
    ELSIF OLD.movement_type = 'ajuste' THEN old_delta := OLD.quantity;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.movement_type = 'entrada' THEN new_delta := NEW.quantity;
    ELSIF NEW.movement_type = 'saida' THEN new_delta := -NEW.quantity;
    ELSIF NEW.movement_type = 'ajuste' THEN new_delta := NEW.quantity;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.products SET stock_current = stock_current + new_delta WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.products SET stock_current = stock_current - old_delta WHERE id = OLD.product_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.product_id = NEW.product_id THEN
      UPDATE public.products SET stock_current = stock_current - old_delta + new_delta WHERE id = NEW.product_id;
    ELSE
      UPDATE public.products SET stock_current = stock_current - old_delta WHERE id = OLD.product_id;
      UPDATE public.products SET stock_current = stock_current + new_delta WHERE id = NEW.product_id;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS tg_stock_move ON public.stock_movements;
CREATE TRIGGER tg_stock_move
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_stock_movement();

-- Remove a função de diagnóstico criada só para investigar o bug acima.
DROP FUNCTION IF EXISTS public.fn_debug_stock_triggers();
