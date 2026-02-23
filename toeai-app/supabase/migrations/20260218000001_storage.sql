-- Storage bucket for user-uploaded images (토답)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder: users/{user_id}/...
CREATE POLICY "Users upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Public read for image URLs (getPublicUrl)
CREATE POLICY "Public read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
