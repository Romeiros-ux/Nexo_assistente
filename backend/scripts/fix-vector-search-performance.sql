-- =========================================
-- FIX: Vector Search Performance Issues
-- =========================================
-- 
-- PROBLEMA: Timeout de 8-9 segundos em buscas vetoriais
-- CAUSA: 3,349 documentos (~100,000 embeddings) sem índice otimizado
-- SOLUÇÃO: Criar índice IVFFlat para busca vetorial rápida
--
-- EXECUTAR NO SUPABASE SQL EDITOR
-- =========================================

-- 1. Aumentar memória temporariamente para criação do índice
-- Necessário: 61 MB, padrão Supabase: 32 MB
SET maintenance_work_mem = '128MB';

-- 2. Remover índices antigos (se existirem)
DROP INDEX IF EXISTS document_embeddings_embedding_idx;
DROP INDEX IF EXISTS document_embeddings_embedding_hnsw_idx;

-- 3. Criar índice IVFFlat otimizado para cosine similarity
-- IVFFlat é mais rápido de construir que HNSW (1-3 min vs 15+ min)
-- Parâmetros:
--   - lists: 100 (número de clusters, ótimo para 100k vetores)
--   - vector_cosine_ops: operador para cosine similarity
CREATE INDEX document_embeddings_embedding_ivfflat_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Verificar estatísticas do índice
ANALYZE document_embeddings;

-- 5. Resetar memória para valor padrão
RESET maintenance_work_mem;

-- 6. Verificar tamanho da tabela e índices
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename = 'document_embeddings';

-- 6. Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'document_embeddings';

-- =========================================
-- TESTE DE PERFORMANCE
-- =========================================

-- Antes do índice: ~8-9 segundos com timeout
-- Depois do índice: ~50-200ms (esperado)

-- Teste de busca (substitua o embedding por um real do seu sistema):
SELECT 
    de.id,
    de.chunk_id,
    dc.content,
    1 - (de.embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM document_embeddings de
JOIN document_chunks dc ON dc.id = de.chunk_id
WHERE 1 - (de.embedding <=> '[0.1, 0.2, ...]'::vector) > 0.5
ORDER BY de.embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- =========================================
-- NOTAS IMPORTANTES
-- =========================================

-- 1. CRIAÇÃO DO ÍNDICE pode demorar 5-15 minutos para 100k embeddings
--    Não interrompa o processo!

-- 2. O índice HNSW reduz busca de O(n) para O(log n)
--    Performance esperada: 8000ms → 50-200ms

-- 3. HNSW vs IVFFlat:
--    - HNSW: Melhor qualidade, mais memória, ideal para < 1M vetores
--    - IVFFlat: Mais rápido build, menor qualidade, ideal para > 1M vetores

-- 4. Se ainda tiver timeout após índice:
--    - Aumentar work_mem: SET work_mem = '256MB';
--    - Aumentar shared_buffers no Supabase dashboard
--    - Considerar particionamento da tabela

-- 5. Monitoring contínuo:
SELECT 
    query,
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as avg_ms,
    max_exec_time as max_ms
FROM pg_stat_statements
WHERE query LIKE '%document_embeddings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
