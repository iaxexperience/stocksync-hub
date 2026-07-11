-- Migração: Cadastro de Clientes, Pedidos, Parcelas, Assinaturas Digitais e Logs de Auditoria

-- ============ TABELA: customers ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('PF', 'PJ')),
  name TEXT NOT NULL,
  trade_name TEXT,
  cpf_cnpj TEXT NOT NULL,
  rg_state_registration TEXT,
  birth_or_opening_date DATE,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Em análise', 'Bloqueado', 'Inadimplente')),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false, -- Exclusão lógica
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_customers_cpf_cnpj ON public.customers(cpf_cnpj);
CREATE INDEX idx_customers_deleted ON public.customers(is_deleted);

-- ============ TABELA: customer_addresses ============
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  zip_code TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_customer ON public.customer_addresses(customer_id);

-- ============ TABELA: orders ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT, -- impede delete físico se houver pedidos
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('pedido', 'orcamento', 'contrato')),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  installation_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  installments INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Pendente', 'Aprovado', 'Cancelado', 'Concluído')),
  payment_status TEXT NOT NULL DEFAULT 'Pendente' CHECK (payment_status IN ('Pendente', 'Pago', 'Parcialmente Pago', 'Cancelado', 'Inadimplente')),
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_org ON public.orders(organization_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);

-- ============ TABELA: order_items ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_fee NUMERIC(14,2) NOT NULL DEFAULT 0, -- acréscimo
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  warranty_days INTEGER,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_order ON public.order_items(order_id);
CREATE INDEX idx_items_product ON public.order_items(product_id);

-- ============ TABELA: installments ============
CREATE TABLE public.installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_installments_order ON public.installments(order_id);

-- ============ TABELA: customer_signatures ============
CREATE TABLE public.customer_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  signature_url TEXT NOT NULL, -- Imagem/dataURI da assinatura
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_information TEXT,
  ip_address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  contract_url TEXT,
  contract_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX idx_signatures_customer ON public.customer_signatures(customer_id);

-- ============ TABELA: audit_logs ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_table_record ON public.audit_logs(organization_id, table_name, record_id);

-- ============ TRIGGERS E FUNÇÕES ============

-- 1. trigger updated_at para customers e orders
CREATE TRIGGER tg_set_updated_at_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Trigger para impedir a exclusão física de um cliente que possui pedidos vinculados
CREATE OR REPLACE FUNCTION public.tg_prevent_customer_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE customer_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é permitido excluir fisicamente clientes com pedidos ou contratos vinculados. Use a exclusão lógica (is_deleted = true).';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_customer_deletion_trigger
BEFORE DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.tg_prevent_customer_deletion();

-- 3. Trigger para auditoria na tabela de clientes
CREATE OR REPLACE FUNCTION public.tg_audit_customer_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, old_data, performed_by)
    VALUES (OLD.organization_id, 'customers', OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (NEW.organization_id, 'customers', NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (organization_id, table_name, record_id, action, new_data, performed_by)
    VALUES (NEW.organization_id, 'customers', NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_customers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_customer_changes();

-- 4. Trigger para verificar estoque antes de aprovar/concluir o pedido
CREATE OR REPLACE FUNCTION public.tg_check_order_stock_before_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item RECORD;
  v_stock_current NUMERIC;
  v_product_name TEXT;
  v_role public.app_role;
BEGIN
  -- Se o status mudar para Aprovado ou Concluído
  IF (NEW.status IN ('Aprovado', 'Concluído') AND (OLD IS NULL OR OLD.status NOT IN ('Aprovado', 'Concluído'))) THEN
    -- Obter papel do usuário na organização
    SELECT role INTO v_role FROM public.organization_members
    WHERE organization_id = NEW.organization_id AND user_id = auth.uid() LIMIT 1;

    FOR item IN 
      SELECT oi.quantity, p.name, p.stock_current
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      IF (item.quantity > item.stock_current AND (v_role IS NULL OR v_role != 'admin')) THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto "%". Estoque disponível: %, Solicitado no pedido: %. Apenas administradores podem autorizar a venda sem estoque.', item.name, item.stock_current, item.quantity;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_order_stock_before_approval_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_check_order_stock_before_approval();

-- 5. Trigger para gerar saídas e devoluções do estoque automaticamente baseando-se no status do pedido
CREATE OR REPLACE FUNCTION public.tg_handle_order_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item RECORD;
BEGIN
  -- Se o pedido foi aprovado/concluído e não era antes, realiza a saída física do estoque
  IF (NEW.status IN ('Aprovado', 'Concluído') AND (OLD IS NULL OR OLD.status NOT IN ('Aprovado', 'Concluído'))) THEN
    FOR item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      -- Se já houver um movimento associado, evita duplicidade
      IF NOT EXISTS (
        SELECT 1 FROM public.stock_movements 
        WHERE reference = NEW.id::text AND product_id = item.product_id AND movement_type = 'saida'
      ) THEN
        INSERT INTO public.stock_movements (organization_id, product_id, movement_type, quantity, unit_cost, reason, reference, created_by)
        VALUES (NEW.organization_id, item.product_id, 'saida', item.quantity, item.unit_price, 'Venda - Pedido #' || NEW.order_number, NEW.id::text, NEW.seller_id);
      END IF;
    END LOOP;
  
  -- Se o pedido foi cancelado e era aprovado/concluído antes, devolve os itens ao estoque
  ELSIF (NEW.status = 'Cancelado' AND OLD IS NOT NULL AND OLD.status IN ('Aprovado', 'Concluído')) THEN
    FOR item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      -- Verifica se houve saída prévia para poder estornar
      IF EXISTS (
        SELECT 1 FROM public.stock_movements 
        WHERE reference = NEW.id::text AND product_id = item.product_id AND movement_type = 'saida'
      ) AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements 
        WHERE reference = NEW.id::text AND product_id = item.product_id AND movement_type = 'entrada' AND reason LIKE 'Cancelamento%'
      ) THEN
        INSERT INTO public.stock_movements (organization_id, product_id, movement_type, quantity, unit_cost, reason, reference, created_by)
        VALUES (NEW.organization_id, item.product_id, 'entrada', item.quantity, item.unit_price, 'Cancelamento - Pedido #' || NEW.order_number, NEW.id::text, auth.uid());
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_order_stock_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_handle_order_stock();

-- ============ SEGURANÇA E RLS (ROW LEVEL SECURITY) ============

-- Habilitar RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissões das tabelas para autenticados e service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_signatures TO authenticated;
GRANT ALL ON public.customer_signatures TO service_role;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Políticas de Acesso por Organização (RLS)

-- customers
CREATE POLICY "org read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) AND is_deleted = false);

CREATE POLICY "org read deleted customers" ON public.customers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id)); -- permite ler deletados em históricos se necessário

CREATE POLICY "org insert customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "org update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "org delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- customer_addresses
CREATE POLICY "org read address" ON public.customer_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_addresses.customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org insert address" ON public.customer_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org update address" ON public.customer_addresses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_addresses.customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org delete address" ON public.customer_addresses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_addresses.customer_id AND public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[])));

-- orders
CREATE POLICY "org read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "org insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "org update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "org delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- order_items
CREATE POLICY "org read items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org insert items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org update items" ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org delete items" ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[])));

-- installments
CREATE POLICY "org read installments" ON public.installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = installments.order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org insert installments" ON public.installments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org update installments" ON public.installments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = installments.order_id AND public.is_org_member(organization_id)));

CREATE POLICY "org delete installments" ON public.installments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = installments.order_id AND public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[])));

-- customer_signatures
CREATE POLICY "org read signatures" ON public.customer_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_signatures.customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org insert signatures" ON public.customer_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org update signatures" ON public.customer_signatures FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_signatures.customer_id AND public.is_org_member(organization_id)));

CREATE POLICY "org delete signatures" ON public.customer_signatures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers WHERE id = customer_signatures.customer_id AND public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[])));

-- audit_logs
CREATE POLICY "org read audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "org insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
