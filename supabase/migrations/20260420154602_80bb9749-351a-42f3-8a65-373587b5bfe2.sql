-- Privátní bucket pro PDF faktur
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: uživatelé spravují PDF jen ve své složce {user_id}/...
CREATE POLICY "Users can upload own invoice PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own invoice PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own invoice PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'invoices'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own invoice PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'invoices'
  AND auth.uid()::text = (storage.foldername(name))[1]
);