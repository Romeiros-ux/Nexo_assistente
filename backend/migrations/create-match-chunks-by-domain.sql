-- ============================================================================
-- FUNÇÃO: match_chunks_by_domain
-- Descrição: Busca vetorial com filtro por domínio educacional
-- ============================================================================

-- Drop da função antiga se existir (para evitar conflito de tipos)
DROP FUNCTION IF EXISTS match_chunks_by_domain(vector, double precision, integer, text, text, text, integer, text);

CREATE OR REPLACE FUNCTION match_chunks_by_domain(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.01,
  match_count int DEFAULT 10,
  filter_domain text DEFAULT NULL,
  filter_subdomain text DEFAULT NULL,
  filter_document_type text DEFAULT NULL,
  filter_year int DEFAULT NULL,
  filter_education_stage text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  document_type text,
  content text,
  similarity float,
  domain text,
  subdomain text,
  metadata_year int,
  education_stage text,
  keywords text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    d.document_type::text AS document_type,
    dc.content,
    1 - (de.embedding <=> query_embedding) AS similarity,
    d.domain::text,
    d.subdomain::text,
    d.metadata_year,
    d.education_stage::text,
    d.keywords
  FROM document_embeddings de
  JOIN document_chunks dc ON de.document_chunk_id = dc.id
  JOIN document_versions dv ON dc.document_version_id = dv.id
  JOIN documents d ON dv.document_id = d.id
  WHERE 
    -- Filtro principal: similaridade
    1 - (de.embedding <=> query_embedding) > match_threshold
    
    -- Filtros de domínio (CRÍTICO)
    AND (filter_domain IS NULL OR d.domain = filter_domain)
    AND (filter_subdomain IS NULL OR d.subdomain = filter_subdomain)
    
    -- Filtros adicionais
    AND (filter_document_type IS NULL OR d.document_type::text = filter_document_type)
    AND (filter_year IS NULL OR d.metadata_year = filter_year)
    AND (filter_education_stage IS NULL OR d.education_stage = filter_education_stage)
    
    -- Apenas documentos ativos
    AND d.status = 'ACTIVE'
    
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION match_chunks_by_domain IS 
'Busca vetorial inteligente com filtro por domínio educacional.
Parâmetros:
- query_embedding: Vetor da pergunta do usuário
- match_threshold: Limite mínimo de similaridade (padrão: 0.01)
- match_count: Número máximo de resultados (padrão: 10)
- filter_domain: Filtrar por domínio (ex: INDICADORES_EDUCACIONAIS)
- filter_subdomain: Filtrar por subdomínio (ex: IDEB)
- filter_document_type: Filtrar por tipo de documento (ex: REPORT)
- filter_year: Filtrar por ano dos dados (ex: 2023)
- filter_education_stage: Filtrar por etapa (ex: AF, AI, EM)

Exemplo:
SELECT * FROM match_chunks_by_domain(
  query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
  match_threshold := 0.7,
  match_count := 5,
  filter_domain := ''INDICADORES_EDUCACIONAIS'',
  filter_subdomain := ''IDEB'',
  filter_year := 2023
);
';

-- ============================================================================
-- TESTES E VALIDAÇÃO
-- ============================================================================

-- Teste 1: Buscar apenas documentos IDEB
-- SELECT COUNT(*) FROM match_chunks_by_domain(
--   query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
--   filter_domain := 'INDICADORES_EDUCACIONAIS',
--   filter_subdomain := 'IDEB'
-- );
-- Resultado esperado: Apenas chunks de documentos IDEB

-- Teste 2: Buscar documentos de 2023
-- SELECT DISTINCT document_name, metadata_year 
-- FROM match_chunks_by_domain(
--   query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
--   filter_year := 2023
-- );
-- Resultado esperado: Apenas documentos com year = 2023

-- Teste 3: Buscar documentos tipo REPORT
-- SELECT DISTINCT document_type 
-- FROM match_chunks_by_domain(
--   query_embedding := (SELECT embedding FROM document_embeddings LIMIT 1),
--   filter_document_type := 'REPORT'
-- );
-- Resultado esperado: Apenas documentos REPORT (Excel)

-- ============================================================================
-- PERFORMANCE E ÍNDICES
-- ============================================================================

-- Verificar se os índices existem
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('documents', 'document_embeddings', 'document_chunks')
-- ORDER BY tablename, indexname;

-- Índices recomendados (já criados na migration):
-- 1. idx_documents_domain ON documents(domain)
-- 2. idx_documents_subdomain ON documents(subdomain)
-- 3. idx_documents_year ON documents(metadata_year)
-- 4. idx_documents_stage ON documents(education_stage)
-- 5. idx_embeddings_vector ON document_embeddings USING ivfflat(embedding)
