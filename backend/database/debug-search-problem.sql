-- 1. Verificar se o D.O.S._1828-8 foi indexado
SELECT 
  d.id,
  d.name,
  d.status,
  dv.indexed,
  COUNT(dc.id) as total_chunks,
  COUNT(de.id) as total_embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.name LIKE '%1828%'
GROUP BY d.id, d.name, d.status, dv.indexed;

-- 2. Testar busca por "exames processo seletivo"
SELECT 
  dc.content,
  d.name as documento,
  1 - (de.embedding <=> (
    SELECT embedding 
    FROM document_embeddings 
    LIMIT 1
  )) as similarity
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.name LIKE '%1828%'
  AND dc.content ILIKE '%hemograma%'
LIMIT 5;

-- 3. Verificar se chunks têm conteúdo
SELECT 
  d.name,
  dc.chunk_index,
  LENGTH(dc.content) as tamanho_chunk,
  LEFT(dc.content, 200) as preview
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.name LIKE '%1828%'
ORDER BY dc.chunk_index
LIMIT 10;

-- 4. Ver documentos retornados na última busca
SELECT 
  d.name,
  d.file_url,
  dc.content
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.name IN ('D.O.S._1797-7_assinado', 'D.O.S._1789-7_assinado')
  AND dc.content ILIKE '%atestado%psiquiátrico%'
LIMIT 3;
