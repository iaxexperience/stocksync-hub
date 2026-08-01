-- Remove itens de pedido sem quantidade (quantidade <= 0) ou associados à Cadeira Infantil
DELETE FROM public.order_items 
WHERE quantity <= 0 
   OR product_id IN (
     SELECT id FROM public.products WHERE name ILIKE '%Cadeira Infantil%'
   );

-- Remove movimentações de estoque associadas à Cadeira Infantil
DELETE FROM public.stock_movements 
WHERE product_id IN (
  SELECT id FROM public.products WHERE name ILIKE '%Cadeira Infantil%'
);

-- Remove registros de avaria associados à Cadeira Infantil
DELETE FROM public.product_damages 
WHERE product_id IN (
  SELECT id FROM public.products WHERE name ILIKE '%Cadeira Infantil%'
);

-- Exclui o produto 'Cadeira Infantil' do banco de dados
DELETE FROM public.products 
WHERE name ILIKE '%Cadeira Infantil%';
