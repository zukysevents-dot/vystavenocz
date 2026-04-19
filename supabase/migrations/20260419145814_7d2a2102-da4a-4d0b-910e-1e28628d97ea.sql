-- Remove broad SELECT policy and replace with one that allows fetching files by exact path,
-- but disallows listing the bucket contents. Public buckets can still be downloaded by URL.
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;

-- Allow public download by direct URL (Storage API treats SELECT as both list and get,
-- but the bucket being public means the CDN URLs work without RLS check).
-- We still grant explicit SELECT only to file owners for listing purposes.
CREATE POLICY "Owners can list own logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);