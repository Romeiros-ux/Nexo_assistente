-- =====================================================
-- LIMPAR TODA BASE DE DADOS - RESET COMPLETO
-- =====================================================
-- Remove TODOS os documentos, versões, chunks e jobs
-- Use com cuidado!

-- 1. Deletar todos os embeddings
DELETE FROM document_embeddings;

-- 2. Deletar todos os chunks
DELETE FROM document_chunks;

-- 3. Deletar todas as versões
DELETE FROM document_versions;

-- 4. Deletar todos os jobs de indexação
DELETE FROM document_indexing_jobs;

-- 5. Deletar todos os documentos
DELETE FROM documents;

-- 6. Verificar limpeza total
SELECT 
  'documents' as tabela, 
  COUNT(*) as registros,
  CASE WHEN COUNT(*) = 0 THEN '✅ Limpo' ELSE '❌ Tem dados' END as status
FROM documents
UNION ALL
SELECT 'document_versions', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅ Limpo' ELSE '❌ Tem dados' END FROM document_versions
UNION ALL
SELECT 'document_chunks', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅ Limpo' ELSE '❌ Tem dados' END FROM document_chunks
UNION ALL
SELECT 'document_embeddings', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅ Limpo' ELSE '❌ Tem dados' END FROM document_embeddings
UNION ALL
SELECT 'document_indexing_jobs', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅ Limpo' ELSE '❌ Tem dados' END FROM document_indexing_jobs;
