-- Encontrar chunks sem embeddings (órfãos)
SELECT 
    d.name,
    COUNT(dc.id) as chunks_sem_embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE de.id IS NULL
GROUP BY d.name
ORDER BY chunks_sem_embeddings DESC;
