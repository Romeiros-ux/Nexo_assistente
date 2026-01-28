-- =========================================
-- REMOVER ÍNDICE HNSW ANTIGO
-- Este índice está causando timeout
-- =========================================

-- Remover índice HNSW antigo (incompleto/corrompido)
DROP INDEX IF EXISTS idx_document_embeddings_vector_cosine;

-- Verificar que apenas IVFFlat permanece
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'document_embeddings'
  AND indexname LIKE '%embedding%'
ORDER BY indexname;

-- RESULTADO ESPERADO:
-- Apenas document_embeddings_embedding_ivfflat_idx deve aparecer
