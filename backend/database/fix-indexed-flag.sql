-- ============================================
-- FIX: Marcar document_versions como indexed
-- ============================================
-- Problema: Documentos foram processados mas
-- o campo 'indexed' não foi marcado como TRUE

-- 1. Verificar situação atual
SELECT 
  d.name,
  dv.indexed,
  COUNT(DISTINCT dc.id) as chunks,
  COUNT(DISTINCT de.id) as embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, dv.indexed
ORDER BY d.name;

-- 2. Atualizar indexed para TRUE onde há embeddings
UPDATE document_versions dv
SET indexed = TRUE
WHERE dv.id IN (
  SELECT DISTINCT dc.document_version_id
  FROM document_chunks dc
  JOIN document_embeddings de ON dc.id = de.document_chunk_id
);

-- 3. Verificar se funcionou
SELECT 
  d.name,
  dv.indexed,
  COUNT(DISTINCT dc.id) as chunks,
  COUNT(DISTINCT de.id) as embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, dv.indexed
ORDER BY d.name;
