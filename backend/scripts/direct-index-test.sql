-- =========================================
-- TESTE DIRETO DE PERFORMANCE DO ÍNDICE
-- =========================================

-- 1. Configurar probes do IVFFlat (aumenta precisão)
SET ivfflat.probes = 10;

-- 2. Desabilitar timeout para este teste
SET statement_timeout = '0';

-- 3. Testar busca vetorial direta (SEM usar match_chunks)
EXPLAIN ANALYZE
SELECT 
    de.id,
    dc.content,
    d.name as doc_name,
    (1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector)) as similarity
FROM document_embeddings de
JOIN document_chunks dc ON dc.id = de.document_chunk_id  
JOIN document_versions dv ON dv.id = dc.document_version_id
JOIN documents d ON d.id = dv.document_id
WHERE 
    d.status = 'ACTIVE'
    AND dv.indexed = TRUE
    AND de.model = 'text-embedding-3-large'
    AND (1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector)) > 0.5
ORDER BY de.embedding <=> array_fill(0.1, ARRAY[1536])::vector
LIMIT 10;

-- RESULTADO ESPERADO:
-- Planning Time: 1-5 ms
-- Execution Time: 100-500 ms (com índice IVFFlat)
-- 
-- Se mostrar "Seq Scan" no plano: índice NÃO está sendo usado!
-- Se mostrar "Index Scan using document_embeddings_embedding_ivfflat_idx": índice OK!
