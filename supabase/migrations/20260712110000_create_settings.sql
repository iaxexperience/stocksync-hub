-- Migration: Create organization_settings table for LGPD, Visual Identity, Inactivity and SMTP integrations

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  lgpd_consent_text TEXT DEFAULT 'Declaro que li e aceito as Políticas de Privacidade e autorizo o tratamento dos meus dados pessoais...',
  lgpd_cookies_enabled BOOLEAN DEFAULT true,
  lgpd_data_deletion_instructions TEXT DEFAULT 'Para solicitar a exclusão de seus dados, envie um e-mail para dpo@suaempresa.com',
  primary_color TEXT DEFAULT '#4f46e5',
  secondary_color TEXT DEFAULT '#0f172a',
  company_logo_url TEXT DEFAULT '',
  inactivity_timeout_minutes INTEGER DEFAULT 15,
  inactivity_action TEXT DEFAULT 'logout',
  email_integration_enabled BOOLEAN DEFAULT false,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_encryption TEXT DEFAULT 'tls',
  email_template TEXT DEFAULT 'Olá {nome_cliente}, segue o link do seu contrato digital #{numero_contrato}: {link_contrato}',
  whatsapp_integration_enabled BOOLEAN DEFAULT false,
  whatsapp_template TEXT DEFAULT 'Olá {nome_cliente}, seu contrato digital #{numero_contrato} do StockFlow foi assinado com sucesso!',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;

-- Policies
DROP POLICY IF EXISTS "org read settings" ON public.organization_settings;
CREATE POLICY "org read settings" ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org insert settings" ON public.organization_settings;
CREATE POLICY "org insert settings" ON public.organization_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org update settings" ON public.organization_settings;
CREATE POLICY "org update settings" ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "org delete settings" ON public.organization_settings;
CREATE POLICY "org delete settings" ON public.organization_settings FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','gerente']::public.app_role[]));

-- Create trigger to automatically update updated_at
CREATE TRIGGER trg_organization_settings_updated_at 
  BEFORE UPDATE ON public.organization_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION public.tg_set_updated_at();
