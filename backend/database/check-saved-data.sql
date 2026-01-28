-- ================================================
-- Verificar Dados Salvos Após Processamento
-- ================================================

-- 1. Contar chunks por documento
SELECT 
    dv.id as version_id,
    d.name as document_name,
    d.document_type,
    d.status,
    COUNT(dc.id) as chunks_count
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.name IN (
    'Lei Ordinária 2232/2022',
    'Lei Ordinária 2667/2024',
    'Lista De Ceps De Saquarema',
    'Plano Municipal De Educação - Saquarema'
)
GROUP BY dv.id, d.name, d.document_type, d.status
ORDER BY d.name;

-- 2. Contar embeddings por documento
SELECT 
    d.name as document_name,
    COUNT(de.id) as embeddings_count
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.name IN (
    'Lei Ordinária 2232/2022',
    'Lei Ordinária 2667/2024',
    'Lista De Ceps De Saquarema',
    'Plano Municipal De Educação - Saquarema'
)
GROUP BY d.name
ORDER BY d.name;

-- 3. Total geral
SELECT 
    COUNT(DISTINCT dc.id) as total_chunks,
    COUNT(DISTINCT de.id) as total_embeddings
FROM document_chunks dc
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id;

-- 4. Ver sample dos chunks salvos
SELECT 
    d.name,
    dc.chunk_index,
    LEFT(dc.content, 100) as content_preview,
    dc.metadata
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.status = 'ACTIVE'
ORDER BY d.name, dc.chunk_index
LIMIT 10;

-- 5. Ver documentos ACTIVE vs PENDING
SELECT 
    status,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as documents
FROM documents
GROUP BY status;
