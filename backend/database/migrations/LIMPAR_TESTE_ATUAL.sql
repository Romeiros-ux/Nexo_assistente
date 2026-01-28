-- =====================================================
-- LIMPAR DOCUMENTO ATUAL PARA NOVO TESTE
-- =====================================================
-- Document ID: e4b91528-5129-477a-9057-d8f8e362bc8f
-- Version ID: cc34248b-df51-47b1-883c-4867d6847c44

-- 1. Deletar embeddings
DELETE FROM document_embeddings
WHERE document_chunk_id IN (
  SELECT id FROM document_chunks WHERE document_version_id = 'cc34248b-df51-47b1-883c-4867d6847c44'
);

-- 2. Deletar chunks
DELETE FROM document_chunks
WHERE document_version_id = 'cc34248b-df51-47b1-883c-4867d6847c44';

-- 3. Deletar versão
DELETE FROM document_versions
WHERE id = 'cc34248b-df51-47b1-883c-4867d6847c44';

-- 4. Deletar jobs
DELETE FROM document_indexing_jobs
WHERE document_id = 'e4b91528-5129-477a-9057-d8f8e362bc8f';

-- 5. Deletar documento
DELETE FROM documents
WHERE id = 'e4b91528-5129-477a-9057-d8f8e362bc8f';

-- 6. Verificar
SELECT 'Limpeza concluída' as status, NOW() as timestamp;
