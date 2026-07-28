-- Vitrine pública: passa a mostrar também produtos sem estoque
-- (a página já trata stock_current <= 0 como "Em falta", com o botão
-- de adicionar desabilitado), a pedido do dono da loja.
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
  AND p.image_url IS NOT NULL;

REVOKE ALL ON public.public_storefront_products FROM PUBLIC;
GRANT SELECT ON public.public_storefront_products TO anon, authenticated;
