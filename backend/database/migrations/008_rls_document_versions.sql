-- =====================================================
-- CRIAR POLÍTICAS RLS PARA document_versions
-- =====================================================

-- 1. Habilitar RLS (se ainda não estiver)
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- 2. Permitir SELECT para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver versões"
ON document_versions
FOR SELECT
TO authenticated
USING (true);

-- 3. Permitir INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem criar versões"
ON document_versions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Permitir UPDATE para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar versões"
ON document_versions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Permitir DELETE apenas para TI
CREATE POLICY "Apenas TI pode deletar versões"
ON document_versions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'TI'
  )
);

-- 6. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'document_versions';
