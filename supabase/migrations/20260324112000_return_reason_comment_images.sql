-- Add richer return request metadata and image proof support.

ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS admin_note TEXT;

UPDATE public.return_requests
SET comment = COALESCE(comment, additional_details)
WHERE comment IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'return-proofs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('return-proofs', 'return-proofs', true);
  END IF;
END
$$;

DROP POLICY IF EXISTS "return_proofs_authenticated_upload" ON storage.objects;
CREATE POLICY "return_proofs_authenticated_upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'return-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "return_proofs_authenticated_update" ON storage.objects;
CREATE POLICY "return_proofs_authenticated_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'return-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'return-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "return_proofs_authenticated_delete" ON storage.objects;
CREATE POLICY "return_proofs_authenticated_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'return-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
