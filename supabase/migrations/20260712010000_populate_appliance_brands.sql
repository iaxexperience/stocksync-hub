-- Migration: Populate default appliance brands for all organizations and update new user trigger

-- 1. Insert standard appliance brands for existing organizations
INSERT INTO public.brands (organization_id, name)
SELECT o.id, b.name
FROM public.organizations o
CROSS JOIN (
  VALUES
    ('Brastemp'),
    ('Consul'),
    ('Electrolux'),
    ('Philco'),
    ('Arno'),
    ('Britânia'),
    ('Mondial'),
    ('Cadence'),
    ('Oster'),
    ('LG'),
    ('Samsung'),
    ('Philips Walita'),
    ('Midea'),
    ('Panasonic'),
    ('Bosch'),
    ('Dako'),
    ('Mueller'),
    ('Suggar'),
    ('Fischer'),
    ('Atlas'),
    ('Esmaltec'),
    ('Black & Decker'),
    ('Whirlpool'),
    ('Lorenzetti'),
    ('WAP'),
    ('De''Longhi'),
    ('KitchenAid'),
    ('Tramontina'),
    ('Mallory'),
    ('Colormaq'),
    ('Latina'),
    ('Venax'),
    ('IBBL'),
    ('Everest'),
    ('GE (General Electric)'),
    ('Continental'),
    ('Smeg'),
    ('Krups'),
    ('Rowenta'),
    ('Tefal')
) AS b(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.brands existing
  WHERE existing.organization_id = o.id AND LOWER(existing.name) = LOWER(b.name)
);

-- 2. Update handle_new_user trigger function to include default brands for new organizations
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

  INSERT INTO public.brands (organization_id, name) VALUES
    (new_org_id, 'Brastemp'),
    (new_org_id, 'Consul'),
    (new_org_id, 'Electrolux'),
    (new_org_id, 'Philco'),
    (new_org_id, 'Arno'),
    (new_org_id, 'Britânia'),
    (new_org_id, 'Mondial'),
    (new_org_id, 'Cadence'),
    (new_org_id, 'Oster'),
    (new_org_id, 'LG'),
    (new_org_id, 'Samsung'),
    (new_org_id, 'Philips Walita'),
    (new_org_id, 'Midea'),
    (new_org_id, 'Panasonic'),
    (new_org_id, 'Bosch'),
    (new_org_id, 'Dako'),
    (new_org_id, 'Mueller'),
    (new_org_id, 'Suggar'),
    (new_org_id, 'Fischer'),
    (new_org_id, 'Atlas'),
    (new_org_id, 'Esmaltec'),
    (new_org_id, 'Black & Decker'),
    (new_org_id, 'Whirlpool'),
    (new_org_id, 'Lorenzetti'),
    (new_org_id, 'WAP'),
    (new_org_id, 'De''Longhi'),
    (new_org_id, 'KitchenAid'),
    (new_org_id, 'Tramontina'),
    (new_org_id, 'Mallory'),
    (new_org_id, 'Colormaq'),
    (new_org_id, 'Latina'),
    (new_org_id, 'Venax'),
    (new_org_id, 'IBBL'),
    (new_org_id, 'Everest'),
    (new_org_id, 'GE (General Electric)'),
    (new_org_id, 'Continental'),
    (new_org_id, 'Smeg'),
    (new_org_id, 'Krups'),
    (new_org_id, 'Rowenta'),
    (new_org_id, 'Tefal');

  RETURN NEW;
END $$;
