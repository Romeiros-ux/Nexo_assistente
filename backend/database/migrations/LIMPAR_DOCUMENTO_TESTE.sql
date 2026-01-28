-- =====================================================
-- LIMPAR DOCUMENTO DE TESTE
-- =====================================================
-- Remove o documento atual para testar o fluxo automático

-- 1. Deletar chunks (se existirem)
DELETE FROM document_chunks 
WHERE document_version_id IN (
  SELECT id FROM document_versions WHERE document_id = 'b9e820ca-8a50-4591-b071-7abfa5a58242'
);

-- 2. Deletar versões
DELETE FROM document_versions 
WHERE document_id = 'b9e820ca-8a50-4591-b071-7abfa5a58242';

-- 3. Deletar jobs de indexação
DELETE FROM document_indexing_jobs
WHERE document_id = 'b9e820ca-8a50-4591-b071-7abfa5a58242';

-- 4. Deletar documento
DELETE FROM documents 
WHERE id = 'b9e820ca-8a50-4591-b071-7abfa5a58242';

-- 5. Verificar limpeza
SELECT 'Documentos restantes:' as info, COUNT(*) as count FROM documents
UNION ALL
SELECT 'Versões restantes:', COUNT(*) FROM document_versions
UNION ALL
SELECT 'Chunks restantes:', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'Jobs restantes:', COUNT(*) FROM document_indexing_jobs;
