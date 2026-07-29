-- Menu Avaria: registra baixa de estoque por produto avariado/danificado.
-- Reaproveita a mesma esteira já usada por Movimentações — cada avaria
-- gera automaticamente uma saída em stock_movements (que já tem um
-- trigger que ajusta products.stock_current), então o estoque nunca
-- fica dessincronizado entre as duas telas.

CREATE TABLE public.product_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.product_damages(organization_id, created_at DESC);
CREATE INDEX ON public.product_damages(product_id);

ALTER TABLE public.product_damages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_damages TO authenticated;
GRANT ALL ON public.product_damages TO service_role;

CREATE POLICY "org read" ON public.product_damages
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "org write" ON public.product_damages
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "org update" ON public.product_damages
  FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));
CREATE POLICY "org delete" ON public.product_damages
  FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- Ao registrar uma avaria: valida que há estoque suficiente e cria a
-- saída correspondente em stock_movements (o trigger já existente em
-- stock_movements desconta de products.stock_current).
CREATE OR REPLACE FUNCTION public.tg_register_damage_stock_exit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current NUMERIC;
BEGIN
  SELECT stock_current INTO v_current FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  IF NEW.quantity > v_current THEN
    RAISE EXCEPTION 'Estoque insuficiente: disponível % , tentando dar baixa de %', v_current, NEW.quantity;
  END IF;

  INSERT INTO public.stock_movements
    (organization_id, product_id, movement_type, quantity, unit_cost, reason, reference, created_by)
  VALUES
    (NEW.organization_id, NEW.product_id, 'saida', NEW.quantity, NEW.unit_cost,
     'Avaria: ' || NEW.reason, NEW.id::text, NEW.created_by);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_product_damage_stock_exit ON public.product_damages;
CREATE TRIGGER tg_product_damage_stock_exit
AFTER INSERT ON public.product_damages
FOR EACH ROW EXECUTE FUNCTION public.tg_register_damage_stock_exit();

-- Ao excluir uma avaria (só admin/gerente): remove a saída correspondente,
-- e o trigger de stock_movements já devolve a quantidade ao estoque.
CREATE OR REPLACE FUNCTION public.tg_reverse_damage_stock_exit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.stock_movements
  WHERE reference = OLD.id::text AND product_id = OLD.product_id AND movement_type = 'saida';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tg_product_damage_stock_reverse ON public.product_damages;
CREATE TRIGGER tg_product_damage_stock_reverse
AFTER DELETE ON public.product_damages
FOR EACH ROW EXECUTE FUNCTION public.tg_reverse_damage_stock_exit();
