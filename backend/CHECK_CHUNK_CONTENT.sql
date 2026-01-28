-- Verificar o conteúdo dos chunks IDEB 2023
SELECT 
  d.name,
  d.education_stage,
  LEFT(dc.content, 200) as preview_content
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023
ORDER BY d.name, dc.chunk_index
LIMIT 12;
