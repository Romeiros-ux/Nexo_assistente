-- ====================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ====================================
-- Bucket: institutional-documents
-- Execute estas políticas após criar o bucket
-- ====================================

-- 1. Permitir UPLOAD para usuários autenticados
CREATE POLICY "Permitir upload de documentos para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'institutional-documents'
);

-- 2. Permitir LEITURA pública (para downloads via URL)
CREATE POLICY "Permitir leitura pública de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'institutional-documents');

-- 3. Permitir DELETE apenas para TI e SECRETARIA
CREATE POLICY "Permitir exclusão apenas para TI e SECRETARIA"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'institutional-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('TI', 'SECRETARIA')
  )
);

-- 4. Permitir UPDATE apenas para TI e SECRETARIA
CREATE POLICY "Permitir atualização apenas para TI e SECRETARIA"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'institutional-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('TI', 'SECRETARIA')
  )
);

-- ====================================
-- VERIFICAÇÃO
-- ====================================

-- Liste todos os buckets (deve mostrar 'institutional-documents')
SELECT * FROM storage.buckets;

-- Liste políticas do bucket
SELECT * FROM pg_policies WHERE tablename = 'objects';
