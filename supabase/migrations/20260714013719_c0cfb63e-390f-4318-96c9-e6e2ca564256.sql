
-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  secondary_color TEXT DEFAULT '#0f172a',
  lgpd_consent_text TEXT,
  lgpd_cookies_enabled BOOLEAN DEFAULT true,
  lgpd_data_deletion_instructions TEXT,
  inactivity_timeout_minutes INTEGER DEFAULT 15,
  inactivity_action TEXT DEFAULT 'logout',
  whatsapp_integration_enabled BOOLEAN DEFAULT false,
  whatsapp_integration_type TEXT DEFAULT 'link',
  whatsapp_template TEXT,
  whatsapp_template_name TEXT DEFAULT 'hello_world',
  whatsapp_api_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_business_account_id TEXT,
  whatsapp_phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view settings" ON public.organization_settings
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins can insert settings" ON public.organization_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']::public.app_role[]));
CREATE POLICY "Org admins can update settings" ON public.organization_settings
  FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY['admin']::public.app_role[]));
CREATE POLICY "Org admins can delete settings" ON public.organization_settings
  FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY['admin']::public.app_role[]));

CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RPC: create_new_organization
CREATE OR REPLACE FUNCTION public.create_new_organization(
  org_name TEXT,
  org_document TEXT DEFAULT NULL,
  org_phone TEXT DEFAULT NULL,
  org_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organizations (name, document, phone, email)
  VALUES (org_name, org_document, org_phone, org_email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, uid, 'admin');

  UPDATE public.profiles SET active_org_id = new_org_id WHERE id = uid;

  INSERT INTO public.warehouses (organization_id, name, is_main)
  VALUES (new_org_id, 'Depósito Principal', true);

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_organization(TEXT, TEXT, TEXT, TEXT) TO authenticated;
