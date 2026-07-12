-- Migration: Update stock movement trigger to handle UPDATE and DELETE

CREATE OR REPLACE FUNCTION public.tg_apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  old_delta NUMERIC := 0;
  new_delta NUMERIC := 0;
BEGIN
  -- Calculate old delta if updating or deleting
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF OLD.movement_type = 'entrada' THEN old_delta := OLD.quantity;
    ELSIF OLD.movement_type = 'saida' THEN old_delta := -OLD.quantity;
    ELSIF OLD.movement_type = 'ajuste' THEN old_delta := OLD.quantity;
    END IF;
  END IF;

  -- Calculate new delta if inserting or updating
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.movement_type = 'entrada' THEN new_delta := NEW.quantity;
    ELSIF NEW.movement_type = 'saida' THEN new_delta := -NEW.quantity;
    ELSIF NEW.movement_type = 'ajuste' THEN new_delta := NEW.quantity;
    END IF;
  END IF;

  -- Apply changes to products table
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.products SET stock_current = stock_current + new_delta WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.products SET stock_current = stock_current - old_delta WHERE id = OLD.product_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If product changed, restore old product stock and update new product stock
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

-- Drop trigger first
DROP TRIGGER IF EXISTS tg_stock_move ON public.stock_movements;

-- Recreate trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER tg_stock_move
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_stock_movement();
