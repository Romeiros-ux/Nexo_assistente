-- Diagnóstico completo da busca RAG

-- 1. Verificar embeddings
SELECT 
  'Embeddings' as tipo,
  COUNT(*) as total,
  COUNT(DISTINCT model) as modelos_diferentes
FROM document_embeddings;

-- 2. Verificar versões indexadas
SELECT 
  'Versões indexadas' as tipo,
  COUNT(*) as total,
  SUM(CASE WHEN indexed = TRUE THEN 1 ELSE 0 END) as indexadas
FROM document_versions;

-- 3. Verificar documentos ACTIVE
SELECT 
  'Documentos ACTIVE' as tipo,
  COUNT(*) as total
FROM documents
WHERE status = 'ACTIVE';

-- 4. JOIN completo (como a função faz)
SELECT 
  d.name,
  d.status,
  dv.indexed,
  de.model,
  COUNT(*) as embeddings_count
FROM document_embeddings de
JOIN document_chunks dc ON dc.id = de.document_chunk_id
JOIN document_versions dv ON dv.id = dc.document_version_id
JOIN documents d ON d.id = dv.document_id
WHERE 
  d.status::TEXT = 'ACTIVE'
  AND dv.indexed = TRUE
  AND de.model = 'text-embedding-3-large'
GROUP BY d.id, d.name, d.status, dv.indexed, de.model;

-- 5. Teste da função com threshold muito baixo
SELECT 
  COUNT(*) as total_results
FROM public.match_chunks(
  ARRAY[0.1]::vector(1536),  -- Vetor fake
  0.01,  -- Threshold muito baixo
  100,
  'ACTIVE',
  NULL,
  NULL
);
