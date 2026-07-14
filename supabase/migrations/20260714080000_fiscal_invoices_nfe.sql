-- NF-e (Nota Fiscal Eletrônica de Mercadoria) — integração em modo SANDBOX/HOMOLOGAÇÃO
-- via gateway (Focus NFe). Emissão real depende de: certificado digital A1 da empresa,
-- inscrição estadual ativa na SEFAZ-PB e cadastro na Focus NFe — nenhum desses é
-- provisionado por este app; até lá, tudo roda no ambiente de homologação (sem valor fiscal).
--
-- A API da Focus NFe exige os dados do emitente em cada requisição (não basta estar
-- cadastrado no painel deles), então organizations precisa dos campos fiscais abaixo
-- além do que já existia (name/document/phone/email/address).
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS state_registration TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_regime SMALLINT; -- 1=Simples Nacional, 2=Simples excesso sublimite, 3=Regime Normal
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_state TEXT; -- UF, 2 letras
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address_zipcode TEXT;

-- NCM (classificação fiscal da mercadoria) é obrigatório por item na NF-e e não existia
-- no cadastro de produtos. Fica nulo até o usuário preencher; emit-nfe valida e recusa
-- itens sem NCM em vez de enviar um código inválido para a Sefaz.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
  ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando_autorizacao'
    CHECK (status IN ('processando_autorizacao', 'autorizado', 'erro_autorizacao', 'cancelado', 'denegado')),
  numero INTEGER,
  serie INTEGER,
  chave_acesso TEXT,
  protocolo TEXT,
  motivo_status TEXT,
  xml_url TEXT,
  danfe_url TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_org ON public.fiscal_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_order ON public.fiscal_invoices(order_id);

ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Só leitura para o front-end: emissão/atualização de status sempre passa pelas
-- Edge Functions (service_role), nunca diretamente pelo cliente — o token da Focus
-- NFe não pode ficar acessível no navegador.
CREATE POLICY "org read fiscal invoices" ON public.fiscal_invoices FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.tg_touch_fiscal_invoice_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fiscal_invoices_touch ON public.fiscal_invoices;
CREATE TRIGGER trg_fiscal_invoices_touch
  BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_fiscal_invoice_updated_at();
