-- Buscar conteúdo específico sobre IDEB Anos Iniciais nos sites
SELECT 
  d.name as documento,
  d.file_url as fonte,
  dc.chunk_index,
  dc.content
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id  
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.document_type = 'OTHER'
  AND d.name LIKE '%qedu%'
  AND (
    (dc.content ILIKE '%ideb%' AND dc.content ILIKE '%anos iniciais%')
    OR (dc.content ILIKE '%ideb%' AND dc.content ILIKE '%AI%')
    OR (dc.content ILIKE '%ideb%' AND dc.content ILIKE '%2023%')
  )
ORDER BY 
  CASE 
    WHEN dc.content ILIKE '%anos iniciais%' AND dc.content ILIKE '%2023%' THEN 1
    WHEN dc.content ILIKE '%anos iniciais%' THEN 2
    ELSE 3
  END,
  d.name,
  dc.chunk_index
LIMIT 3;
