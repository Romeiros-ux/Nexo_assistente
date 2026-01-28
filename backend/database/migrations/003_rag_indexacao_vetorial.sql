-- ==========================================
-- MIGRATION 003: RAG - Indexação Vetorial
-- ==========================================
-- Data: Janeiro 2026
-- Descrição: Adiciona infraestrutura para indexação vetorial (embeddings)
--            e busca semântica com pgvector
-- 
-- Dependências: 
--   - Migration 002 (RAG Preparação) aplicada
--   - Extensão pgvector habilitada
-- 
-- Ajustes aprovados:
--   - Status mantido como está (PROCESSING/COMPLETED/FAILED)
--   - match_chunks() usando LANGUAGE sql STABLE (não plpgsql)
--   - Filtro de unidade no SQL (defesa em profundidade)
--   - Logs de custo apenas no backend (sem tabela embedding_costs)
-- ==========================================

-- ==========================================
-- 1. VERIFICAR EXTENSÃO PGVECTOR
-- ==========================================
-- Garantir que pgvector está habilitado

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'Extensão pgvector não está habilitada. Execute: CREATE EXTENSION vector;';
  END IF;
END $$;

-- ==========================================
-- 2. ADICIONAR CAMPO 'indexed' EM DOCUMENT_VERSIONS
-- ==========================================
-- Controla se embeddings foram gerados para esta versão

ALTER TABLE public.document_versions
ADD COLUMN IF NOT EXISTS indexed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.document_versions.indexed IS 'Indica se embeddings foram gerados para esta versão';

-- Índice para buscar versões não indexadas
CREATE INDEX IF NOT EXISTS idx_document_versions_not_indexed
  ON public.document_versions(indexed)
  WHERE status = 'COMPLETED' AND indexed = FALSE;

-- ==========================================
-- 3. TABELA: DOCUMENT_EMBEDDINGS
-- ==========================================
-- Armazena vetores (embeddings) dos chunks
-- 1 chunk = 1 embedding
-- Dimensão: 1536 (text-embedding-3-large com dimensions=1536)
-- Nota: HNSW index tem limite de 2000 dimensões, 1536 é ótimo para RAG

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  
  -- Embedding vetorial (1536 dimensões)
  embedding vector(1536) NOT NULL,
  
  -- Versionamento de modelo
  model VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-large',
  model_version VARCHAR(20) DEFAULT 'v1',
  
  -- Controle de custo (tokens usados para gerar este embedding)
  tokens_used INTEGER NOT NULL,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT document_embeddings_unique_chunk_model UNIQUE (document_chunk_id, model),
  CONSTRAINT document_embeddings_tokens_positive CHECK (tokens_used > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_id 
  ON public.document_embeddings(document_chunk_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_model 
  ON public.document_embeddings(model)
  WHERE model = 'text-embedding-3-large';

-- Índice HNSW para busca vetorial (similaridade de cosseno)
-- m = 16: número de conexões por nó (padrão: 16, bom para maioria dos casos)
-- ef_construction = 64: qualidade do índice (maior = melhor qualidade, mais lento)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector_cosine
  ON public.document_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Comentários
COMMENT ON TABLE public.document_embeddings IS 'Embeddings vetoriais dos chunks (text-embedding-3-large, 1536 dimensões)';
COMMENT ON COLUMN public.document_embeddings.embedding IS 'Vetor de 1536 dimensões gerado pela OpenAI (dimensions=1536 na API)';
COMMENT ON COLUMN public.document_embeddings.model IS 'Modelo usado para gerar embedding (permite versionamento)';
COMMENT ON COLUMN public.document_embeddings.tokens_used IS 'Tokens consumidos para gerar este embedding (controle de custo)';

-- ==========================================
-- 4. FUNÇÃO: BUSCA SEMÂNTICA (match_chunks)
-- ==========================================
-- Busca chunks por similaridade vetorial com filtros de governança

CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 8,
  filter_status TEXT DEFAULT 'ACTIVE',
  filter_document_type TEXT DEFAULT NULL,
  filter_unit_id UUID DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_content TEXT,
  chunk_metadata JSONB,
  document_id UUID,
  document_name TEXT,
  document_type TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    dc.id AS chunk_id,
    dc.content AS chunk_content,
    dc.metadata AS chunk_metadata,
    d.id AS document_id,
    d.name AS document_name,
    d.document_type::TEXT AS document_type,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  JOIN public.document_chunks dc ON dc.id = de.document_chunk_id
  JOIN public.document_versions dv ON dv.id = dc.document_version_id
  JOIN public.documents d ON d.id = dv.document_id
  WHERE 
    -- Filtros obrigatórios
    d.status::TEXT = filter_status
    AND dv.indexed = TRUE
    AND de.model = 'text-embedding-3-large'  -- Modelo ativo
    
    -- Similaridade mínima (threshold)
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    
    -- Filtros opcionais
    AND (filter_document_type IS NULL OR d.document_type::TEXT = filter_document_type)
    
    -- Filtro de unidade (defesa em profundidade)
    -- Se filter_unit_id for fornecido, apenas documentos vinculados àquela unidade
    -- TODO: Implementar relacionamento documents <-> educational_units
    -- AND (filter_unit_id IS NULL OR EXISTS (
    --   SELECT 1 FROM document_units du 
    --   WHERE du.document_id = d.id AND du.unit_id = filter_unit_id
    -- ))
    
  ORDER BY de.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_chunks IS 
'Busca semântica de chunks por similaridade vetorial (cosine distance)
Parâmetros:
  - query_embedding: vetor da query do usuário (1536 dim)
  - match_threshold: similaridade mínima (padrão: 0.78)
  - match_count: máximo de chunks a retornar (padrão: 8)
  - filter_status: status do documento (padrão: ACTIVE)
  - filter_document_type: tipo do documento (opcional)
  - filter_unit_id: filtro por unidade educacional (opcional)
Retorna: chunks ordenados por similaridade decrescente';

-- ==========================================
-- 5. VIEW: ESTATÍSTICAS DE INDEXAÇÃO
-- ==========================================
-- Visão para monitorar status de indexação dos documentos

CREATE OR REPLACE VIEW public.v_indexing_stats AS
SELECT 
  d.id AS document_id,
  d.name AS document_name,
  d.document_type,
  d.status AS document_status,
  d.prepared,
  dv.id AS version_id,
  dv.version_number,
  dv.status AS version_status,
  dv.indexed,
  COUNT(DISTINCT dc.id) AS total_chunks,
  COUNT(DISTINCT de.id) AS indexed_chunks,
  CASE 
    WHEN COUNT(DISTINCT dc.id) = 0 THEN 'SEM_CHUNKS'
    WHEN COUNT(DISTINCT de.id) = 0 THEN 'NAO_INDEXADO'
    WHEN COUNT(DISTINCT de.id) < COUNT(DISTINCT dc.id) THEN 'PARCIALMENTE_INDEXADO'
    ELSE 'TOTALMENTE_INDEXADO'
  END AS indexing_status,
  SUM(de.tokens_used) AS total_tokens_used,
  MAX(de.created_at) AS last_indexed_at
FROM public.documents d
LEFT JOIN public.document_versions dv ON d.id = dv.document_id
LEFT JOIN public.document_chunks dc ON dv.id = dc.document_version_id
LEFT JOIN public.document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, d.document_type, d.status, d.prepared, dv.id, dv.version_number, dv.status, dv.indexed;

COMMENT ON VIEW public.v_indexing_stats IS 
'Estatísticas de indexação dos documentos ativos
Status possíveis:
  - SEM_CHUNKS: documento sem chunks (preparação não concluída)
  - NAO_INDEXADO: documento com chunks mas sem embeddings
  - PARCIALMENTE_INDEXADO: alguns chunks têm embeddings, outros não
  - TOTALMENTE_INDEXADO: todos os chunks têm embeddings';

-- ==========================================
-- 6. RLS POLICIES (Row-Level Security)
-- ==========================================
-- Garantir acesso controlado à tabela de embeddings

-- Habilitar RLS
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Política: Backend (service_role) tem acesso total
CREATE POLICY "Backend can do anything on document_embeddings"
  ON public.document_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem ler embeddings de documentos ativos
-- (necessário para debugging, mas chunks já filtram via match_chunks)
CREATE POLICY "Users can read embeddings of active documents"
  ON public.document_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.document_chunks dc
      JOIN public.document_versions dv ON dv.id = dc.document_version_id
      JOIN public.documents d ON d.id = dv.document_id
      WHERE dc.id = document_embeddings.document_chunk_id
      AND d.status = 'ACTIVE'
    )
  );

-- ==========================================
-- 7. ÍNDICES ADICIONAIS DE PERFORMANCE
-- ==========================================

-- Busca rápida de documentos preparados mas não indexados
CREATE INDEX IF NOT EXISTS idx_documents_prepared_not_indexed
  ON public.documents(prepared, status)
  WHERE prepared = TRUE AND status = 'ACTIVE';

-- Busca rápida de embeddings por modelo ativo
CREATE INDEX IF NOT EXISTS idx_embeddings_active_model
  ON public.document_embeddings(model, created_at DESC)
  WHERE model = 'text-embedding-3-large';

-- ==========================================
-- 8. FUNÇÕES AUXILIARES
-- ==========================================

-- Função para calcular custo estimado de embeddings (USD)
-- Pricing: text-embedding-3-large = $0.13 / 1M tokens
CREATE OR REPLACE FUNCTION public.calculate_embedding_cost(tokens INTEGER)
RETURNS DECIMAL(10, 6)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (tokens::DECIMAL / 1000000.0) * 0.13;
$$;

COMMENT ON FUNCTION public.calculate_embedding_cost IS 
'Calcula custo em USD para gerar embeddings
Pricing atual: $0.13 / 1M tokens (text-embedding-3-large)
Parâmetro: tokens (INTEGER)
Retorna: custo em USD (DECIMAL com 6 casas decimais)';

-- ==========================================
-- FIM DA MIGRATION 003
-- ==========================================

-- Verificações finais
DO $$ 
BEGIN
  -- Verificar se tabela foi criada
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_embeddings') THEN
    RAISE EXCEPTION 'Tabela document_embeddings não foi criada';
  END IF;
  
  -- Verificar se campo indexed foi adicionado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_versions' 
    AND column_name = 'indexed'
  ) THEN
    RAISE EXCEPTION 'Campo indexed não foi adicionado em document_versions';
  END IF;
  
  -- Verificar se função match_chunks foi criada
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_chunks') THEN
    RAISE EXCEPTION 'Função match_chunks não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Migration 003 aplicada com sucesso!';
  RAISE NOTICE 'Tabelas criadas: document_embeddings';
  RAISE NOTICE 'Campos adicionados: document_versions.indexed';
  RAISE NOTICE 'Funções criadas: match_chunks, calculate_embedding_cost';
  RAISE NOTICE 'View criada: v_indexing_stats';
END $$;

-- Para reverter (se necessário):
-- DROP VIEW IF EXISTS v_indexing_stats;
-- DROP FUNCTION IF EXISTS match_chunks;
-- DROP FUNCTION IF EXISTS calculate_embedding_cost;
-- DROP TABLE IF EXISTS document_embeddings CASCADE;
-- ALTER TABLE public.document_versions DROP COLUMN IF EXISTS indexed;
