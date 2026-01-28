-- Verificar metadata dos chunks
SELECT 
  d.name,
  dc.chunk_index,
  dc.metadata as chunk_metadata,
  d.metadata as document_metadata
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.name LIKE '%1828%'
LIMIT 5;

-- Comparar com documentos antigos
SELECT 
  d.name,
  dc.chunk_index,
  dc.metadata as chunk_metadata,
  d.metadata as document_metadata
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.name IN ('D.O.S._1797-7_assinado', 'D.O.S._1789-7_assinado')
LIMIT 5;
