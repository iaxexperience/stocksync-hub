
-- Add address to organizations for contract rendering
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address text;

-- =========================
-- customers
-- =========================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_type text NOT NULL DEFAULT 'PF',
  name text NOT NULL,
  trade_name text,
  cpf_cnpj text,
  rg_state_registration text,
  birth_or_opening_date date,
  phone text,
  whatsapp text,
  email text,
  photo_url text,
  status text NOT NULL DEFAULT 'Ativo',
  notes text,
  marital_status text,
  profession text,
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers org members read" ON public.customers FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "customers org members insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "customers org members update" ON public.customers FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "customers org members delete" ON public.customers FOR DELETE TO authenticated USING (public.is_org_member(organization_id));
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);

-- =========================
-- customer_addresses
-- =========================
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  reference text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_addresses org read" ON public.customer_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.is_org_member(c.organization_id)));
CREATE POLICY "customer_addresses org insert" ON public.customer_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.is_org_member(c.organization_id)));
CREATE POLICY "customer_addresses org update" ON public.customer_addresses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.is_org_member(c.organization_id)));
CREATE POLICY "customer_addresses org delete" ON public.customer_addresses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.is_org_member(c.organization_id)));
CREATE TRIGGER trg_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- orders
-- =========================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  seller_id uuid,
  order_number text NOT NULL,
  order_type text NOT NULL DEFAULT 'pedido',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  shipping_fee numeric(14,2) NOT NULL DEFAULT 0,
  installation_fee numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text,
  installments int NOT NULL DEFAULT 1,
  first_due_date date,
  status text NOT NULL DEFAULT 'Pendente',
  payment_status text NOT NULL DEFAULT 'Pendente',
  delivery_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders org read" ON public.orders FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "orders org insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "orders org update" ON public.orders FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "orders org delete" ON public.orders FOR DELETE TO authenticated USING (public.is_org_member(organization_id));
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders(organization_id);

-- =========================
-- order_items
-- =========================
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  additional_fee numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  warranty_days int,
  serial_number text,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items org read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "order_items org insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "order_items org update" ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "order_items org delete" ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- =========================
-- installments
-- =========================
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installment_number int NOT NULL,
  due_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_date date,
  payment_method text,
  status text NOT NULL DEFAULT 'Pendente',
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments org read" ON public.installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "installments org insert" ON public.installments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "installments org update" ON public.installments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "installments org delete" ON public.installments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE TRIGGER trg_installments_updated_at BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_installments_order ON public.installments(order_id);

-- =========================
-- customer_signatures
-- =========================
CREATE TABLE IF NOT EXISTS public.customer_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  signature_url text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_by uuid,
  device_information text,
  ip_address text,
  latitude numeric,
  longitude numeric,
  contract_url text,
  contract_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_signatures TO authenticated;
GRANT ALL ON public.customer_signatures TO service_role;
ALTER TABLE public.customer_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_signatures org read" ON public.customer_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "customer_signatures org insert" ON public.customer_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "customer_signatures org update" ON public.customer_signatures FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));
CREATE POLICY "customer_signatures org delete" ON public.customer_signatures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_org_member(o.organization_id)));

-- =========================
-- audit_logs
-- =========================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs org read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "audit_logs org insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
