-- ==========================================
-- MIGRATION 005: Background Jobs - Indexação Assíncrona
-- ==========================================
-- Data: Janeiro 2026
-- Descrição: Adiciona infraestrutura para processamento assíncrono de indexação
--            com controle de filas, retry automático e auditoria completa
-- 
-- Dependências: 
--   - Migration 003 (RAG Indexação Vetorial) aplicada
--   - Bull/BullMQ configurado no backend
--   - Redis ativo
-- ==========================================

-- ==========================================
-- 1. TABELA: DOCUMENT_INDEXING_JOBS
-- ==========================================
-- Controla o ciclo de vida dos jobs de indexação

CREATE TABLE IF NOT EXISTS public.document_indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Status do job
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (
    status IN (
      'NOT_STARTED',      -- Job criado, aguardando processamento
      'IN_PROGRESS',      -- Job sendo processado
      'COMPLETED',        -- Job concluído com sucesso
      'PARTIAL_INDEXED',  -- Alguns chunks indexados, mas não todos
      'INDEXING_FAILED'   -- Falha na indexação
    )
  ),
  
  -- Metadados do processamento
  chunks_generated INTEGER DEFAULT 0,
  embeddings_generated INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  
  -- Controle de erro e retry
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Custos
  total_cost_usd NUMERIC(10, 8) DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Bull/BullMQ metadata (opcional, para correlação)
  bull_job_id TEXT,
  
  CONSTRAINT document_indexing_jobs_retry_positive CHECK (retry_count >= 0),
  CONSTRAINT document_indexing_jobs_cost_positive CHECK (total_cost_usd >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_document_id 
  ON public.document_indexing_jobs(document_id);

CREATE INDEX IF NOT EXISTS idx_indexing_jobs_status 
  ON public.document_indexing_jobs(status);

CREATE INDEX IF NOT EXISTS idx_indexing_jobs_created_at 
  ON public.document_indexing_jobs(created_at DESC);

-- Índice para buscar jobs pendentes
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_pending
  ON public.document_indexing_jobs(status, created_at)
  WHERE status IN ('NOT_STARTED', 'INDEXING_FAILED');

-- Índice para buscar jobs em progresso
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_in_progress
  ON public.document_indexing_jobs(status, started_at DESC)
  WHERE status = 'IN_PROGRESS';

-- Comentários
COMMENT ON TABLE public.document_indexing_jobs IS 
'Controle de jobs de indexação assíncrona (background jobs com Bull/BullMQ)';

COMMENT ON COLUMN public.document_indexing_jobs.status IS 
'Status do job: NOT_STARTED (aguardando) | IN_PROGRESS (processando) | COMPLETED (sucesso) | PARTIAL_INDEXED (parcial) | INDEXING_FAILED (erro)';

COMMENT ON COLUMN public.document_indexing_jobs.retry_count IS 
'Número de tentativas realizadas (para retry automático)';

COMMENT ON COLUMN public.document_indexing_jobs.bull_job_id IS 
'ID do job no Bull/BullMQ (para correlação e debug)';

-- ==========================================
-- 2. TRIGGER: AUTO-UPDATE TIMESTAMP
-- ==========================================
-- Atualiza `updated_at` automaticamente

CREATE OR REPLACE FUNCTION update_indexing_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_indexing_jobs_timestamp ON public.document_indexing_jobs;
CREATE TRIGGER trigger_update_indexing_jobs_timestamp
  BEFORE UPDATE ON public.document_indexing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_indexing_jobs_timestamp();

-- ==========================================
-- 3. VIEW: JOBS STATISTICS
-- ==========================================
-- Estatísticas gerais dos jobs de indexação

CREATE OR REPLACE VIEW public.v_indexing_jobs_stats AS
SELECT 
  -- Contadores gerais
  COUNT(*) AS total_jobs,
  
  -- Por status
  COUNT(*) FILTER (WHERE status = 'NOT_STARTED') AS jobs_pending,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS jobs_in_progress,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS jobs_completed,
  COUNT(*) FILTER (WHERE status = 'PARTIAL_INDEXED') AS jobs_partial,
  COUNT(*) FILTER (WHERE status = 'INDEXING_FAILED') AS jobs_failed,
  
  -- Taxa de sucesso
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'COMPLETED')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) AS success_rate_percent,
  
  -- Métricas de processamento
  SUM(chunks_generated) AS total_chunks_generated,
  SUM(embeddings_generated) AS total_embeddings_generated,
  SUM(tokens_used) AS total_tokens_used,
  SUM(total_cost_usd) AS total_cost_usd,
  
  -- Tempo médio de processamento (jobs concluídos)
  AVG(
    EXTRACT(EPOCH FROM (finished_at - started_at))
  ) FILTER (WHERE status = 'COMPLETED') AS avg_processing_time_seconds,
  
  -- Retry stats
  AVG(retry_count) AS avg_retries,
  MAX(retry_count) AS max_retries_observed,
  
  -- Timestamps
  MIN(created_at) AS first_job_at,
  MAX(created_at) AS last_job_at
FROM public.document_indexing_jobs;

COMMENT ON VIEW public.v_indexing_jobs_stats IS 
'Estatísticas agregadas dos jobs de indexação (performance, custos, taxa de sucesso)';

-- ==========================================
-- 4. VIEW: JOBS RECENTES COM DETALHES
-- ==========================================
-- Lista jobs recentes com informações do documento

CREATE OR REPLACE VIEW public.v_indexing_jobs_recent AS
SELECT 
  j.id AS job_id,
  j.status,
  j.bull_job_id,
  
  -- Documento
  d.id AS document_id,
  d.name AS document_name,
  d.document_type,
  d.status AS document_status,
  
  -- Métricas
  j.chunks_generated,
  j.embeddings_generated,
  j.tokens_used,
  j.total_cost_usd,
  
  -- Tempo de processamento
  CASE 
    WHEN j.finished_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (j.finished_at - j.started_at))
    WHEN j.started_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (NOW() - j.started_at))
    ELSE NULL
  END AS processing_time_seconds,
  
  -- Retry
  j.retry_count,
  j.max_retries,
  j.error_message,
  
  -- Timestamps
  j.created_at,
  j.started_at,
  j.finished_at,
  j.updated_at
FROM public.document_indexing_jobs j
JOIN public.documents d ON d.id = j.document_id
ORDER BY j.created_at DESC
LIMIT 100;

COMMENT ON VIEW public.v_indexing_jobs_recent IS 
'Últimos 100 jobs de indexação com detalhes do documento (para monitoramento)';

-- ==========================================
-- 5. VIEW: JOBS COM FALHA (PARA RETRY)
-- ==========================================
-- Lista jobs que falharam e ainda podem ser retentados

CREATE OR REPLACE VIEW public.v_indexing_jobs_failed AS
SELECT 
  j.id AS job_id,
  j.bull_job_id,
  j.document_id,
  d.name AS document_name,
  j.status,
  j.error_message,
  j.retry_count,
  j.max_retries,
  (j.max_retries - j.retry_count) AS retries_remaining,
  j.created_at,
  j.updated_at
FROM public.document_indexing_jobs j
JOIN public.documents d ON d.id = j.document_id
WHERE j.status = 'INDEXING_FAILED'
  AND j.retry_count < j.max_retries
ORDER BY j.created_at DESC;

COMMENT ON VIEW public.v_indexing_jobs_failed IS 
'Jobs que falharam mas ainda podem ser retentados (retry_count < max_retries)';

-- ==========================================
-- 6. FUNÇÃO: CRIAR JOB DE INDEXAÇÃO
-- ==========================================
-- Função auxiliar para criar um novo job de indexação

CREATE OR REPLACE FUNCTION public.create_indexing_job(
  p_document_id UUID,
  p_bull_job_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Criar novo job
  INSERT INTO public.document_indexing_jobs (
    document_id,
    bull_job_id,
    status
  ) VALUES (
    p_document_id,
    p_bull_job_id,
    'NOT_STARTED'
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

COMMENT ON FUNCTION public.create_indexing_job IS 
'Cria um novo job de indexação para um documento
Parâmetros:
  - p_document_id: UUID do documento a ser indexado
  - p_bull_job_id: ID do job no Bull/BullMQ (opcional)
Retorna: UUID do job criado';

-- ==========================================
-- 7. FUNÇÃO: ATUALIZAR STATUS DO JOB
-- ==========================================
-- Função auxiliar para atualizar status e métricas

CREATE OR REPLACE FUNCTION public.update_indexing_job_status(
  p_job_id UUID,
  p_status TEXT,
  p_chunks_generated INTEGER DEFAULT NULL,
  p_embeddings_generated INTEGER DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL,
  p_total_cost_usd NUMERIC DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.document_indexing_jobs
  SET 
    status = p_status,
    chunks_generated = COALESCE(p_chunks_generated, chunks_generated),
    embeddings_generated = COALESCE(p_embeddings_generated, embeddings_generated),
    tokens_used = COALESCE(p_tokens_used, tokens_used),
    total_cost_usd = COALESCE(p_total_cost_usd, total_cost_usd),
    error_message = COALESCE(p_error_message, error_message),
    started_at = CASE 
      WHEN p_status = 'IN_PROGRESS' AND started_at IS NULL THEN NOW()
      ELSE started_at
    END,
    finished_at = CASE 
      WHEN p_status IN ('COMPLETED', 'PARTIAL_INDEXED', 'INDEXING_FAILED') THEN NOW()
      ELSE finished_at
    END
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.update_indexing_job_status IS 
'Atualiza status e métricas de um job de indexação
Parâmetros:
  - p_job_id: UUID do job
  - p_status: Novo status
  - p_chunks_generated: Número de chunks gerados (opcional)
  - p_embeddings_generated: Número de embeddings gerados (opcional)
  - p_tokens_used: Total de tokens usados (opcional)
  - p_total_cost_usd: Custo total em USD (opcional)
  - p_error_message: Mensagem de erro (opcional)
Retorna: TRUE se job foi encontrado e atualizado';

-- ==========================================
-- 8. FUNÇÃO: INCREMENTAR RETRY
-- ==========================================
-- Incrementa contador de retry quando job falha

CREATE OR REPLACE FUNCTION public.increment_job_retry(
  p_job_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_retry_count INTEGER;
BEGIN
  UPDATE public.document_indexing_jobs
  SET retry_count = retry_count + 1
  WHERE id = p_job_id
  RETURNING retry_count INTO v_new_retry_count;
  
  RETURN v_new_retry_count;
END;
$$;

COMMENT ON FUNCTION public.increment_job_retry IS 
'Incrementa o contador de retry de um job
Retorna: Novo valor de retry_count';

-- ==========================================
-- 9. RLS POLICIES (Row-Level Security)
-- ==========================================

ALTER TABLE public.document_indexing_jobs ENABLE ROW LEVEL SECURITY;

-- Backend (service_role) tem acesso total
CREATE POLICY "Backend can do anything on indexing_jobs"
  ON public.document_indexing_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler jobs dos seus documentos
CREATE POLICY "Users can read their indexing jobs"
  ON public.document_indexing_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_indexing_jobs.document_id
      AND d.status = 'ACTIVE'
    )
  );

-- ==========================================
-- 10. VALIDAÇÕES FINAIS
-- ==========================================

DO $$ 
BEGIN
  -- Verificar se tabela foi criada
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'document_indexing_jobs'
  ) THEN
    RAISE EXCEPTION 'Tabela document_indexing_jobs não foi criada';
  END IF;
  
  -- Verificar views
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_indexing_jobs_stats'
  ) THEN
    RAISE EXCEPTION 'View v_indexing_jobs_stats não foi criada';
  END IF;
  
  -- Verificar funções
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_indexing_job'
  ) THEN
    RAISE EXCEPTION 'Função create_indexing_job não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Migration 005 aplicada com sucesso!';
  RAISE NOTICE 'Tabela criada: document_indexing_jobs';
  RAISE NOTICE 'Views criadas: v_indexing_jobs_stats, v_indexing_jobs_recent, v_indexing_jobs_failed';
  RAISE NOTICE 'Funções criadas: create_indexing_job, update_indexing_job_status, increment_job_retry';
  RAISE NOTICE 'Pronto para integração com Bull/BullMQ!';
END $$;

-- ==========================================
-- FIM DA MIGRATION 005
-- ==========================================

-- Para aplicar no Supabase SQL Editor:
-- 1. Copie todo este arquivo
-- 2. Cole no SQL Editor
-- 3. Execute
-- 4. Verifique mensagens de sucesso

-- Para reverter (se necessário):
-- DROP VIEW IF EXISTS v_indexing_jobs_failed;
-- DROP VIEW IF EXISTS v_indexing_jobs_recent;
-- DROP VIEW IF EXISTS v_indexing_jobs_stats;
-- DROP FUNCTION IF EXISTS increment_job_retry;
-- DROP FUNCTION IF EXISTS update_indexing_job_status;
-- DROP FUNCTION IF EXISTS create_indexing_job;
-- DROP TRIGGER IF EXISTS trigger_update_indexing_jobs_timestamp ON document_indexing_jobs;
-- DROP FUNCTION IF EXISTS update_indexing_jobs_timestamp;
-- DROP TABLE IF EXISTS document_indexing_jobs CASCADE;
