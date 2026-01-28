-- Verificar o novo conteúdo estruturado dos chunks IDEB 2023
SELECT 
  d.name,
  d.education_stage,
  dc.chunk_index,
  LENGTH(dc.content) as tamanho,
  LEFT(dc.content, 400) as preview
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023
ORDER BY d.name, dc.chunk_index
LIMIT 5;
