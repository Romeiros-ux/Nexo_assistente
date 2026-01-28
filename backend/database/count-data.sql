-- ================================================
-- Contar Dados Salvos (QUERY SIMPLES)
-- ================================================

-- 1. Quantos chunks foram salvos?
SELECT COUNT(*) as total_chunks FROM document_chunks;

-- 2. Quantos embeddings foram salvos?
SELECT COUNT(*) as total_embeddings FROM document_embeddings;

-- 3. Detalhes por documento (se houver chunks)
SELECT 
    d.name as document_name,
    COUNT(dc.id) as chunks_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_version_id
WHERE d.status = 'ACTIVE'
GROUP BY d.name
ORDER BY d.name;

-- 4. Detalhes de embeddings (se houver)
SELECT 
    COUNT(*) as embeddings_count,
    model,
    model_version
FROM document_embeddings
GROUP BY model, model_version;
