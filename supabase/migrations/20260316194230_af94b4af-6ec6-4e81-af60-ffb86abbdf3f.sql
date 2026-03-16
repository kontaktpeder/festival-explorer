
-- Create storage bucket for finance attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-bilag', 'finance-bilag', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload finance attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'finance-bilag');

-- Allow public read access
CREATE POLICY "Public read access for finance attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'finance-bilag');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete finance attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'finance-bilag');
