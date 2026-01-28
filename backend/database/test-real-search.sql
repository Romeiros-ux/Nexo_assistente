-- Simular a busca real
-- Primeiro, buscar chunks do D.O.S._1828-8 que mencionam "exames"
SELECT 
  dc.content,
  LENGTH(dc.content) as tamanho,
  d.name
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.name LIKE '%1828%'
  AND dc.content ILIKE '%hemograma%'
ORDER BY LENGTH(dc.content) DESC;

-- Ver quais documentos têm mais chunks sobre "processo seletivo"
SELECT 
  d.name,
  COUNT(*) as chunks_relevantes
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE dc.content ILIKE '%processo seletivo%'
  AND dc.content ILIKE '%exame%'
GROUP BY d.name
ORDER BY chunks_relevantes DESC
LIMIT 10;
