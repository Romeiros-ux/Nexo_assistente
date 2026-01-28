-- Verificar se o índice IVFFlat foi criado
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'document_embeddings'
ORDER BY indexname;

-- Verificar estatísticas da tabela
SELECT 
    schemaname,
    tablename,
    n_live_tup as total_rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_stat_user_tables
WHERE tablename = 'document_embeddings';

-- Testar se o índice está sendo usado
EXPLAIN ANALYZE
SELECT 
    de.id,
    de.chunk_id,
    1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector) as similarity
FROM document_embeddings de
WHERE 1 - (de.embedding <=> array_fill(0.1, ARRAY[1536])::vector) > 0.5
ORDER BY de.embedding <=> array_fill(0.1, ARRAY[1536])::vector
LIMIT 10;
