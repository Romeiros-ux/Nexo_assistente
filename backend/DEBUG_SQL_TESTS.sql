-- ============================================================================
-- TESTE DIRETO: Verificar se há chunks IDEB 2023 com embeddings
-- ============================================================================

-- 1. Verificar documentos IDEB 2023
SELECT 
  d.id,
  d.name,
  d.domain,
  d.subdomain,
  d.metadata_year,
  d.education_stage
FROM documents d
WHERE d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023;

-- Resultado esperado: 3 documentos
-- Se retornar 0, o problema está na classificação dos documentos

-- ============================================================================

-- 2. Verificar chunks desses documentos
SELECT 
  d.name,
  dv.id as version_id,
  COUNT(dc.id) as num_chunks
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023
GROUP BY d.name, dv.id;

-- Resultado esperado: 3 documentos com 4 chunks cada (12 total)
-- Se retornar 0, os chunks não foram criados corretamente

-- ============================================================================

-- 3. Verificar embeddings
SELECT 
  d.name,
  COUNT(de.id) as num_embeddings
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023
GROUP BY d.name;

-- Resultado esperado: 3 documentos com 4 embeddings cada
-- Se retornar 0, os embeddings não foram gerados

-- ============================================================================

-- 4. Teste da função SEM filtro de ano
SELECT 
  document_name,
  metadata_year,
  education_stage,
  similarity
FROM match_chunks_by_domain(
  query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
  match_threshold := 0.01,
  match_count := 20,
  filter_domain := 'INDICADORES_EDUCACIONAIS',
  filter_subdomain := 'IDEB'
  -- SEM filter_year
)
ORDER BY similarity DESC;

-- Resultado esperado: Deve retornar chunks IDEB (qualquer ano)
-- Se retornar 0, o problema está nos JOINs da função

-- ============================================================================

-- 5. Teste COM filtro de ano
SELECT 
  document_name,
  metadata_year,
  education_stage,
  similarity
FROM match_chunks_by_domain(
  query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
  match_threshold := 0.01,
  match_count := 20,
  filter_domain := 'INDICADORES_EDUCACIONAIS',
  filter_subdomain := 'IDEB',
  filter_year := 2023
)
ORDER BY similarity DESC;

-- Resultado esperado: Deve retornar apenas chunks IDEB 2023
-- Se retornar 0, o problema é o filtro de ano ou metadata_year

-- ============================================================================

-- 6. Verificar tipo da coluna metadata_year
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name = 'metadata_year';

-- Resultado esperado: data_type = integer
