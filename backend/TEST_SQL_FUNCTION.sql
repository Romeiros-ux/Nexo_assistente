-- ============================================================================
-- TESTE RÁPIDO: Verificar se a função match_chunks_by_domain funciona
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor para testar

-- Teste 1: Buscar documentos IDEB (sem filtro de ano)
SELECT 
  document_name,
  document_type,
  domain,
  subdomain,
  metadata_year,
  education_stage,
  similarity
FROM match_chunks_by_domain(
  query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
  match_threshold := 0.01,
  match_count := 5,
  filter_domain := 'INDICADORES_EDUCACIONAIS',
  filter_subdomain := 'IDEB'
)
ORDER BY similarity DESC;

-- Resultado esperado:
-- - Apenas documentos com domain = 'INDICADORES_EDUCACIONAIS'
-- - Apenas documentos com subdomain = 'IDEB'
-- - Deve retornar os 3 arquivos Excel IDEB
