-- ==========================================
-- MIGRATION 002: RAG - Preparação do Conhecimento
-- ==========================================
-- Data: Janeiro 2026
-- Descrição: Adiciona infraestrutura para preparação de documentos para RAG
--            (versionamento, extração de texto e chunking)
-- 
-- ⚠️ IMPORTANTE: Esta fase NÃO inclui embeddings ou vetorização
-- Isso será feito na FASE 2 (Indexação Vetorial)
-- ==========================================

-- ==========================================
-- 1. ATUALIZAR TABELA DOCUMENTS
-- ==========================================
-- Adicionar campo 'prepared' para indicar se documento foi processado

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS prepared BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.documents.prepared IS 'Indica se o documento foi preparado (texto extraído e chunks gerados)';

-- ==========================================
-- 2. TABELA: DOCUMENT_VERSIONS
-- ==========================================
-- Armazena versões de documentos para versionamento semântico
-- Cada upload ou atualização gera uma nova versão

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  
  -- Metadados de extração
  extracted_text_length INTEGER,
  extraction_method VARCHAR(50), -- 'pdf-parse', 'mammoth', 'direct'
  extraction_error TEXT,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT document_versions_status_check CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  CONSTRAINT document_versions_unique_version UNIQUE (document_id, version_number)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_status ON public.document_versions(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON public.document_versions(created_at DESC);

-- Comentários
COMMENT ON TABLE public.document_versions IS 'Versionamento de documentos para RAG - cada upload/atualização gera nova versão';
COMMENT ON COLUMN public.document_versions.version_number IS 'Número sequencial da versão (1, 2, 3...)';
COMMENT ON COLUMN public.document_versions.status IS 'PROCESSING: extraindo texto | COMPLETED: pronto | FAILED: erro na extração';
COMMENT ON COLUMN public.document_versions.extraction_method IS 'Método usado: pdf-parse, mammoth, direct (TXT)';

-- ==========================================
-- 3. TABELA: DOCUMENT_CHUNKS
-- ==========================================
-- Armazena blocos de texto extraídos e divididos semanticamente
-- Cada chunk tem 500-800 caracteres com overlap de 50-100

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
  
  -- Conteúdo
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Ordem do chunk no documento (0, 1, 2...)
  
  -- Metadados (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Exemplos de metadata:
  -- { "page": 3, "section": "Artigo 5º", "char_count": 650, "word_count": 95 }
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT document_chunks_unique_index UNIQUE (document_version_id, chunk_index),
  CONSTRAINT document_chunks_content_not_empty CHECK (length(content) > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_version_id ON public.document_chunks(document_version_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON public.document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata ON public.document_chunks USING GIN(metadata);

-- Comentários
COMMENT ON TABLE public.document_chunks IS 'Chunks de texto extraídos dos documentos (500-800 caracteres com overlap)';
COMMENT ON COLUMN public.document_chunks.content IS 'Texto do chunk (bloco semântico)';
COMMENT ON COLUMN public.document_chunks.chunk_index IS 'Ordem sequencial do chunk no documento (0-based)';
COMMENT ON COLUMN public.document_chunks.metadata IS 'Metadados: página, seção, contagens, etc.';

-- ==========================================
-- 4. FUNÇÃO: AUTO-INCREMENTO DE VERSION_NUMBER
-- ==========================================
-- Garante que version_number é automático e sequencial por documento

CREATE OR REPLACE FUNCTION auto_version_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM public.document_versions
    WHERE document_id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para aplicar auto-incremento
DROP TRIGGER IF EXISTS trigger_auto_version_number ON public.document_versions;
CREATE TRIGGER trigger_auto_version_number
  BEFORE INSERT ON public.document_versions
  FOR EACH ROW
  EXECUTE FUNCTION auto_version_number();

-- ==========================================
-- 5. FUNÇÃO: ESTATÍSTICAS DE PREPARAÇÃO
-- ==========================================
-- View para monitorar status de preparação dos documentos

CREATE OR REPLACE VIEW v_document_preparation_stats AS
SELECT 
  d.id,
  d.name,
  d.document_type,
  d.status,
  d.prepared,
  COUNT(DISTINCT dv.id) as version_count,
  MAX(dv.version_number) as latest_version,
  COUNT(dc.id) as total_chunks,
  MAX(dv.created_at) as last_processed_at,
  CASE 
    WHEN MAX(dv.status) = 'FAILED' THEN 'ERRO'
    WHEN MAX(dv.status) = 'PROCESSING' THEN 'PROCESSANDO'
    WHEN MAX(dv.status) = 'COMPLETED' THEN 'COMPLETO'
    ELSE 'PENDENTE'
  END as preparation_status
FROM public.documents d
LEFT JOIN public.document_versions dv ON d.id = dv.document_id
LEFT JOIN public.document_chunks dc ON dv.id = dc.document_version_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, d.document_type, d.status, d.prepared;

COMMENT ON VIEW v_document_preparation_stats IS 'Estatísticas de preparação dos documentos ativos';

-- ==========================================
-- 6. RLS POLICIES (Row-Level Security)
-- ==========================================
-- Garantir acesso controlado às novas tabelas

-- Habilitar RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Políticas: Backend (service_role) tem acesso total
CREATE POLICY "Backend can do anything on document_versions"
  ON public.document_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend can do anything on document_chunks"
  ON public.document_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas: Usuários autenticados podem ler (via backend)
CREATE POLICY "Users can read document_versions via backend"
  ON public.document_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
      AND d.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can read document_chunks via backend"
  ON public.document_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_versions dv
      JOIN public.documents d ON d.id = dv.document_id
      WHERE dv.id = document_chunks.document_version_id
      AND d.status = 'ACTIVE'
    )
  );

-- ==========================================
-- 7. ÍNDICES ADICIONAIS DE PERFORMANCE
-- ==========================================

-- Busca por documentos não preparados
CREATE INDEX IF NOT EXISTS idx_documents_not_prepared 
  ON public.documents(prepared) 
  WHERE status = 'ACTIVE' AND prepared = FALSE;

-- Busca por versões em processamento
CREATE INDEX IF NOT EXISTS idx_versions_processing 
  ON public.document_versions(status, created_at) 
  WHERE status = 'PROCESSING';

-- ==========================================
-- FIM DA MIGRATION 002
-- ==========================================

-- Para aplicar:
-- psql -U postgres -d seu_banco < 002_rag_preparation_schema.sql

-- Para reverter (se necessário):
-- DROP VIEW IF EXISTS v_document_preparation_stats;
-- DROP TRIGGER IF EXISTS trigger_auto_version_number ON public.document_versions;
-- DROP FUNCTION IF EXISTS auto_version_number();
-- DROP TABLE IF EXISTS public.document_chunks CASCADE;
-- DROP TABLE IF EXISTS public.document_versions CASCADE;
-- ALTER TABLE public.documents DROP COLUMN IF EXISTS prepared;
