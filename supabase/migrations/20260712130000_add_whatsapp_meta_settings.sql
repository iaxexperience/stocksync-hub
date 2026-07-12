-- Migration: Add WhatsApp Meta Cloud API settings columns to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_template_name TEXT DEFAULT 'hello_world',
  ADD COLUMN IF NOT EXISTS whatsapp_integration_type TEXT DEFAULT 'link';
