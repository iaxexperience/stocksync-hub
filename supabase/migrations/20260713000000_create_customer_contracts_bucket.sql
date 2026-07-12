-- Migration: Create customer-contracts bucket and enable policies

-- 1. Create a public bucket for generated contract PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-contracts', 'customer-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for public reading
CREATE POLICY "Allow public read access to customer contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-contracts');

-- 3. Policies for authenticated users to upload/update/delete
CREATE POLICY "Allow authenticated upload access to customer contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-contracts');

CREATE POLICY "Allow authenticated update access to customer contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'customer-contracts');

CREATE POLICY "Allow authenticated delete access to customer contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer-contracts');
