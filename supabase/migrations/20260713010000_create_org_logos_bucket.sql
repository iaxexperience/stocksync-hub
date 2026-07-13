-- Migration: Create org-logos bucket for whitelabel company logo uploads

-- 1. Create a public bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for public reading
CREATE POLICY "Allow public read access to org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- 3. Policies for authenticated users to upload/update/delete
CREATE POLICY "Allow authenticated upload access to org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY "Allow authenticated update access to org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-logos');

CREATE POLICY "Allow authenticated delete access to org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');
