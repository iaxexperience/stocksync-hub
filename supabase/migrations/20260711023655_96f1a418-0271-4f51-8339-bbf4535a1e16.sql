
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','gerente','estoquista','comprador','financeiro','vendedor','visualizador');
CREATE TYPE public.product_type AS ENUM ('material_consumo','material_permanente','eletrodomestico','equipamento','peca','acessorio','produto_venda','produto_uso_interno');
CREATE TYPE public.product_status AS ENUM ('ativo','inativo','manutencao','defeito','descartado');
CREATE TYPE public.movement_type AS ENUM ('entrada','saida','transferencia','ajuste');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  active_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ORG MEMBERS ============
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'visualizador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX ON public.organization_members(user_id);
CREATE INDEX ON public.organization_members(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- ============ PROFILES / ORGS RLS ============
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Members read org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "Admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['admin']::public.app_role[]));

CREATE POLICY "Members read memberships" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY "Admins manage memberships" ON public.organization_members FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin']::public.app_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']::public.app_role[]));

-- ============ REUSABLE updated_at ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ MASTER DATA ============
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  email TEXT,
  phone TEXT,
  contact_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  product_type public.product_type NOT NULL DEFAULT 'produto_venda',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_current NUMERIC(14,3) NOT NULL DEFAULT 0,
  stock_min NUMERIC(14,3) NOT NULL DEFAULT 0,
  stock_max NUMERIC(14,3) NOT NULL DEFAULT 0,
  location TEXT,
  serial_number TEXT,
  voltage TEXT,
  power TEXT,
  model TEXT,
  warranty_months INT,
  expires_at DATE,
  image_url TEXT,
  status public.product_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products(organization_id);
CREATE INDEX ON public.products(sku);
CREATE INDEX ON public.products(barcode);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  movement_type public.movement_type NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason TEXT,
  reference TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stock_movements(product_id);
CREATE INDEX ON public.stock_movements(organization_id, created_at DESC);

-- ============ GRANTS FOR MASTER DATA ============
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['warehouses','categories','brands','units','suppliers','products','stock_movements'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "org read" ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org write" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org update" ON public.%I FOR UPDATE TO authenticated USING (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org delete" ON public.%I FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''admin'',''gerente'']::public.app_role[]))', t);
  END LOOP;
END $$;

-- updated_at triggers
CREATE TRIGGER t1 BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t2 BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t3 BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t4 BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t5 BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t6 BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t7 BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ STOCK BALANCE TRIGGER ============
CREATE OR REPLACE FUNCTION public.tg_apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE delta NUMERIC;
BEGIN
  IF NEW.movement_type = 'entrada' THEN delta := NEW.quantity;
  ELSIF NEW.movement_type = 'saida' THEN delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'ajuste' THEN delta := NEW.quantity;
  ELSE delta := 0;
  END IF;
  UPDATE public.products SET stock_current = stock_current + delta WHERE id = NEW.product_id;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_stock_move AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_stock_movement();

-- ============ AUTO-CREATE ORG ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org_id UUID;
        full_name TEXT;
        company_name TEXT;
BEGIN
  full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');

  INSERT INTO public.organizations (name, document, phone, email)
  VALUES (company_name, NEW.raw_user_meta_data->>'document', NEW.raw_user_meta_data->>'phone', NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, full_name, email, phone, active_org_id)
  VALUES (NEW.id, full_name, NEW.email, NEW.raw_user_meta_data->>'phone', new_org_id);

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  INSERT INTO public.warehouses (organization_id, name, is_main) VALUES (new_org_id, 'Depósito Principal', true);
  INSERT INTO public.units (organization_id, name, abbreviation) VALUES
    (new_org_id, 'Unidade', 'UN'),
    (new_org_id, 'Caixa', 'CX'),
    (new_org_id, 'Quilograma', 'KG'),
    (new_org_id, 'Litro', 'L'),
    (new_org_id, 'Metro', 'M');
  INSERT INTO public.categories (organization_id, name) VALUES
    (new_org_id, 'Materiais'),
    (new_org_id, 'Eletrodomésticos'),
    (new_org_id, 'Equipamentos'),
    (new_org_id, 'Consumíveis');

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
