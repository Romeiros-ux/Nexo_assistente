-- =========================================
-- TESTE COM THRESHOLD MAIS BAIXO + ANÁLISE DE EMBEDDINGS
-- =========================================

-- 1. Ver estatísticas dos embeddings
SELECT 
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT model) as models,
    COUNT(DISTINCT document_chunk_id) as unique_chunks
FROM document_embeddings
WHERE model = 'text-embedding-3-large';

-- 2. Testar com threshold MUITO BAIXO (0.1)
SET ivfflat.probes = 10;
SET statement_timeout = '0';

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
    AND (1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector)) > 0.1  -- THRESHOLD BAIXO
ORDER BY de.embedding <=> array_fill(0.1, ARRAY[1536])::vector
LIMIT 10;

-- 3. Ver as 5 maiores similaridades (independente do threshold)
SELECT 
    d.name as doc_name,
    LEFT(dc.content, 100) as content_preview,
    (1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector)) as similarity
FROM document_embeddings de
JOIN document_chunks dc ON dc.id = de.document_chunk_id  
JOIN document_versions dv ON dv.id = dc.document_version_id
JOIN documents d ON d.id = dv.document_id
WHERE 
    d.status = 'ACTIVE'
    AND dv.indexed = TRUE
    AND de.model = 'text-embedding-3-large'
ORDER BY de.embedding <=> array_fill(0.1, ARRAY[1536])::vector
LIMIT 5;

-- 4. Verificar se há embeddings válidos (não nulos, não zeros)
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as nulls,
    COUNT(CASE WHEN embedding = array_fill(0, ARRAY[1536])::vector THEN 1 END) as all_zeros
FROM document_embeddings
WHERE model = 'text-embedding-3-large';
