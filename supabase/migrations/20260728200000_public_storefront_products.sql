-- Vitrine pública (/loja): expõe só o necessário pra montar a vitrine —
-- nunca preço (sale_price/cost_price), sku, fornecedor ou qualquer outro
-- dado interno. A view já filtra pela organização real da loja, então o
-- acesso anônimo nunca enxerga produtos de outra organização, mesmo que
-- a tabela products dependa de RLS por organization_id internamente.
CREATE OR REPLACE VIEW public.public_storefront_products
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.name,
  p.image_url,
  p.stock_current,
  p.category_id,
  c.name AS category_name
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.organization_id = '74454d72-7148-4472-bb72-f7f98c7fe74c'
  AND p.status = 'ativo'
  AND p.image_url IS NOT NULL
  AND p.stock_current > 0;

REVOKE ALL ON public.public_storefront_products FROM PUBLIC;
GRANT SELECT ON public.public_storefront_products TO anon, authenticated;
