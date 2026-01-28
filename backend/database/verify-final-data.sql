-- Verificar dados finais do processamento

-- 1. Total de chunks e embeddings
SELECT 
    (SELECT COUNT(*) FROM document_chunks) as total_chunks,
    (SELECT COUNT(*) FROM document_embeddings) as total_embeddings;

-- 2. Breakdown por documento (apenas ACTIVE)
SELECT 
    d.name,
    d.status,
    d.document_type,
    COUNT(DISTINCT dc.id) as chunks,
    COUNT(DISTINCT de.id) as embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, d.status, d.document_type
ORDER BY d.name;

-- 3. Verificar modelo usado
SELECT DISTINCT model, model_version, COUNT(*) as count
FROM document_embeddings
GROUP BY model, model_version;

-- 4. Sample de um chunk para testar busca
SELECT 
    d.name,
    dc.chunk_index,
    LEFT(dc.content, 200) as preview,
    de.model as embedding_model
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.name = 'Lista De Ceps De Saquarema'
ORDER BY dc.chunk_index
LIMIT 3;
