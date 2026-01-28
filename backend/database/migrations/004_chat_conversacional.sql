-- ==========================================
-- MIGRATION 004: FASE 3 - Chat Conversacional
-- ==========================================
-- Data: Janeiro 2026
-- Descrição: Adiciona infraestrutura para chat conversacional (RAG + LLM)
--            - Logs de interações
--            - Citações de documentos
--            - Auditoria completa
-- 
-- Dependências: 
--   - Migration 003 (RAG Indexação Vetorial) aplicada
--   - OpenAI API configurada
-- ==========================================

-- ==========================================
-- 1. TABELA: CHAT_LOGS
-- ==========================================
-- Registra cada interação do chat para auditoria

CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do usuário
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_profile TEXT NOT NULL CHECK (user_profile IN ('DIRETOR', 'COMISSAO', 'SECRETARIA', 'TI')),
  unit_id UUID REFERENCES public.educational_units(id) ON DELETE SET NULL,
  
  -- Interação
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- Métricas RAG
  chunks_found INTEGER NOT NULL DEFAULT 0,
  
  -- Métricas LLM
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  
  -- Custos (USD)
  cost_search NUMERIC(10, 8) NOT NULL DEFAULT 0,
  cost_llm NUMERIC(10, 8) NOT NULL,
  cost_total NUMERIC(10, 8) NOT NULL,
  
  -- Versionamento
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chat_logs_tokens_positive CHECK (tokens_input >= 0 AND tokens_output >= 0),
  CONSTRAINT chat_logs_cost_positive CHECK (cost_total >= 0)
);

-- Índices para performance e auditoria
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id 
  ON public.chat_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_profile 
  ON public.chat_logs(user_profile);

CREATE INDEX IF NOT EXISTS idx_chat_logs_unit_id 
  ON public.chat_logs(unit_id) 
  WHERE unit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at 
  ON public.chat_logs(created_at DESC);

-- Índice composto para análise de custos
CREATE INDEX IF NOT EXISTS idx_chat_logs_cost_analysis 
  ON public.chat_logs(user_profile, created_at DESC, cost_total);

-- Comentários
COMMENT ON TABLE public.chat_logs IS 'Registro de todas as interações do chat conversacional (auditoria e compliance)';
COMMENT ON COLUMN public.chat_logs.user_profile IS 'Perfil do usuário no momento da interação';
COMMENT ON COLUMN public.chat_logs.chunks_found IS 'Número de chunks encontrados na busca RAG';
COMMENT ON COLUMN public.chat_logs.tokens_input IS 'Tokens enviados ao LLM (prompt + contexto)';
COMMENT ON COLUMN public.chat_logs.tokens_output IS 'Tokens gerados pelo LLM (resposta)';
COMMENT ON COLUMN public.chat_logs.cost_search IS 'Custo da busca semântica (embedding)';
COMMENT ON COLUMN public.chat_logs.cost_llm IS 'Custo da geração de resposta (LLM)';
COMMENT ON COLUMN public.chat_logs.prompt_version IS 'Versão do prompt master utilizado';

-- ==========================================
-- 2. TABELA: CHAT_CITATIONS
-- ==========================================
-- Rastreia quais documentos foram citados em cada resposta

CREATE TABLE IF NOT EXISTS public.chat_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com chat
  chat_log_id UUID NOT NULL REFERENCES public.chat_logs(id) ON DELETE CASCADE,
  
  -- Documento citado
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  
  -- Chunk específico usado
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chat_citations_similarity_range CHECK (similarity >= 0 AND similarity <= 1)
);

-- Índices para análise
CREATE INDEX IF NOT EXISTS idx_chat_citations_chat_log_id 
  ON public.chat_citations(chat_log_id);

CREATE INDEX IF NOT EXISTS idx_chat_citations_document_id 
  ON public.chat_citations(document_id);

CREATE INDEX IF NOT EXISTS idx_chat_citations_chunk_id 
  ON public.chat_citations(chunk_id);

-- Comentários
COMMENT ON TABLE public.chat_citations IS 'Rastreabilidade: quais documentos foram usados em cada resposta do chat';
COMMENT ON COLUMN public.chat_citations.similarity IS 'Similaridade vetorial entre query e chunk (0-1)';

-- ==========================================
-- 3. VIEW: CHAT_STATS
-- ==========================================
-- Estatísticas agregadas de uso do chat

CREATE OR REPLACE VIEW public.v_chat_stats AS
SELECT 
  -- Contadores gerais
  COUNT(*) AS total_interactions,
  COUNT(DISTINCT user_id) AS unique_users,
  
  -- Por perfil
  COUNT(*) FILTER (WHERE user_profile = 'DIRETOR') AS interactions_diretor,
  COUNT(*) FILTER (WHERE user_profile = 'COMISSAO') AS interactions_comissao,
  COUNT(*) FILTER (WHERE user_profile = 'SECRETARIA') AS interactions_secretaria,
  COUNT(*) FILTER (WHERE user_profile = 'TI') AS interactions_ti,
  
  -- Métricas de chunks
  AVG(chunks_found) AS avg_chunks_per_query,
  SUM(chunks_found) AS total_chunks_retrieved,
  COUNT(*) FILTER (WHERE chunks_found = 0) AS queries_no_results,
  
  -- Métricas de tokens
  SUM(tokens_input) AS total_tokens_input,
  SUM(tokens_output) AS total_tokens_output,
  SUM(tokens_input + tokens_output) AS total_tokens,
  AVG(tokens_input + tokens_output) AS avg_tokens_per_query,
  
  -- Métricas de custo
  SUM(cost_search) AS total_cost_search,
  SUM(cost_llm) AS total_cost_llm,
  SUM(cost_total) AS total_cost,
  AVG(cost_total) AS avg_cost_per_query,
  
  -- Temporal
  MIN(created_at) AS first_interaction,
  MAX(created_at) AS last_interaction
FROM public.chat_logs;

COMMENT ON VIEW public.v_chat_stats IS 'Estatísticas agregadas de uso do chat conversacional';

-- ==========================================
-- 4. VIEW: POPULAR_QUERIES
-- ==========================================
-- Queries mais frequentes (análise de padrões)

CREATE OR REPLACE VIEW public.v_popular_queries AS
SELECT 
  LOWER(TRIM(query)) AS normalized_query,
  COUNT(*) AS frequency,
  AVG(chunks_found) AS avg_chunks_found,
  AVG(cost_total) AS avg_cost,
  MAX(created_at) AS last_asked
FROM public.chat_logs
WHERE chunks_found > 0  -- Apenas queries com resultados
GROUP BY LOWER(TRIM(query))
HAVING COUNT(*) > 1  -- Apenas queries repetidas
ORDER BY frequency DESC, last_asked DESC
LIMIT 100;

COMMENT ON VIEW public.v_popular_queries IS 'Top 100 queries mais frequentes do chat';

-- ==========================================
-- 5. VIEW: MOST_CITED_DOCUMENTS
-- ==========================================
-- Documentos mais citados nas respostas

CREATE OR REPLACE VIEW public.v_most_cited_documents AS
SELECT 
  cc.document_id,
  cc.document_name,
  cc.document_type,
  COUNT(DISTINCT cc.chat_log_id) AS times_cited,
  AVG(cc.similarity) AS avg_similarity,
  MAX(cc.created_at) AS last_cited
FROM public.chat_citations cc
GROUP BY cc.document_id, cc.document_name, cc.document_type
ORDER BY times_cited DESC, last_cited DESC
LIMIT 50;

COMMENT ON VIEW public.v_most_cited_documents IS 'Top 50 documentos mais citados nas respostas do chat';

-- ==========================================
-- 6. RLS (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_citations ENABLE ROW LEVEL SECURITY;

-- Política para chat_logs: Usuário vê apenas seus próprios logs
CREATE POLICY chat_logs_select_own ON public.chat_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para TI: Acesso total aos logs
CREATE POLICY chat_logs_select_ti ON public.chat_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'TI'
    )
  );

-- Política para chat_citations: Usuário vê citações dos seus próprios chats
CREATE POLICY chat_citations_select_own ON public.chat_citations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_logs
      WHERE id = chat_log_id AND user_id = auth.uid()
    )
  );

-- Política para TI: Acesso total às citações
CREATE POLICY chat_citations_select_ti ON public.chat_citations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'TI'
    )
  );

-- ==========================================
-- 7. FUNÇÃO: CUSTO ESTIMADO MENSAL
-- ==========================================

CREATE OR REPLACE FUNCTION public.calculate_monthly_chat_cost(
  target_month DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  month DATE,
  total_interactions BIGINT,
  total_cost NUMERIC,
  cost_search NUMERIC,
  cost_llm NUMERIC,
  avg_cost_per_interaction NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    DATE_TRUNC('month', created_at)::DATE AS month,
    COUNT(*) AS total_interactions,
    SUM(cost_total) AS total_cost,
    SUM(cost_search) AS cost_search,
    SUM(cost_llm) AS cost_llm,
    AVG(cost_total) AS avg_cost_per_interaction
  FROM public.chat_logs
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', target_month)
  GROUP BY DATE_TRUNC('month', created_at);
$$;

COMMENT ON FUNCTION public.calculate_monthly_chat_cost IS 
'Calcula o custo total do chat conversacional para um mês específico';

-- ==========================================
-- 8. VERIFICAÇÃO E ROLLBACK
-- ==========================================

-- Verificar se migration foi aplicada corretamente
DO $$ 
DECLARE
  chat_logs_exists BOOLEAN;
  chat_citations_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_logs'
  ) INTO chat_logs_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_citations'
  ) INTO chat_citations_exists;
  
  IF chat_logs_exists AND chat_citations_exists THEN
    RAISE NOTICE 'Migration 004 aplicada com sucesso!';
    RAISE NOTICE 'Tabelas: chat_logs, chat_citations';
    RAISE NOTICE 'Views: v_chat_stats, v_popular_queries, v_most_cited_documents';
    RAISE NOTICE 'RLS: Habilitado com políticas de acesso';
  ELSE
    RAISE EXCEPTION 'Migration 004 falhou - tabelas não foram criadas';
  END IF;
END $$;

-- ==========================================
-- ROLLBACK (se necessário)
-- ==========================================

-- Para reverter esta migration:
/*
DROP VIEW IF EXISTS public.v_most_cited_documents CASCADE;
DROP VIEW IF EXISTS public.v_popular_queries CASCADE;
DROP VIEW IF EXISTS public.v_chat_stats CASCADE;
DROP FUNCTION IF EXISTS public.calculate_monthly_chat_cost(DATE) CASCADE;
DROP TABLE IF EXISTS public.chat_citations CASCADE;
DROP TABLE IF EXISTS public.chat_logs CASCADE;
*/
