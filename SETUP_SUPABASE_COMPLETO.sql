-- ═══════════════════════════════════════════════════════════════════════════
-- 🏗️ SETUP COMPLETO DO SUPABASE - NEXO ASSISTENTE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUÇÕES:
-- 1. Abra o Supabase SQL Editor (menu lateral → SQL Editor)
-- 2. Clique em "New query"
-- 3. Copie TUDO deste arquivo
-- 4. Cole no editor
-- 5. Clique em "Run" (ou pressione Ctrl+Enter)
-- 6. Aguarde ~30 segundos
-- 7. Verifique mensagem de sucesso no final
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: EXTENSÕES NECESSÁRIAS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: ENUMS (TIPOS CUSTOMIZADOS)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('TI', 'SECRETARIA', 'DIRETOR', 'COORDENACAO', 'COMISSAO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE status_type AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('SCHOOL', 'CENTER', 'DEPARTMENT', 'SECRETARIAT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('NORM', 'LAW', 'RESOLUTION', 'DIRECTIVE', 'MANUAL', 'REPORT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 3: TABELAS PRINCIPAIS
-- ═══════════════════════════════════════════════════════════════════════════

-- USERS (extensão do Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  status status_type DEFAULT 'ACTIVE',
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- EDUCATIONAL UNITS
CREATE TABLE IF NOT EXISTS public.educational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type unit_type NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER UNITS (N:N)
CREATE TABLE IF NOT EXISTS public.user_units (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.educational_units(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, unit_id)
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  version TEXT DEFAULT '1.0',
  status status_type DEFAULT 'ACTIVE',
  official_number TEXT,
  publication_date DATE,
  effective_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_public BOOLEAN DEFAULT false,
  requires_authorization BOOLEAN DEFAULT false,
  
  -- Metadados para RAG
  domain TEXT,
  subdomain TEXT,
  keywords TEXT[],
  year INTEGER,
  education_stage TEXT,
  
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800)
);

-- DOCUMENT VERSIONS
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  status document_status DEFAULT 'PENDING',
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(id),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,
  chunks_count INTEGER DEFAULT 0,
  UNIQUE(document_id, version_number)
);

-- DOCUMENT CHUNKS
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  char_count INTEGER,
  token_count INTEGER,
  page_number INTEGER,
  section_title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, version_id, chunk_index)
);

-- DOCUMENT EMBEDDINGS (vetores para RAG)
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  embedding vector(1536),
  model_name TEXT DEFAULT 'text-embedding-3-large',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chunk_id)
);

-- CHAT LOGS (auditoria)
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_profile user_role NOT NULL,
  unit_id UUID REFERENCES public.educational_units(id),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  chunks_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CHAT CITATIONS (rastreamento de fontes)
CREATE TABLE IF NOT EXISTS public.chat_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_log_id UUID NOT NULL REFERENCES public.chat_logs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BACKGROUND JOBS
CREATE TABLE IF NOT EXISTS public.document_indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4: ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_domain ON public.documents(domain);
CREATE INDEX IF NOT EXISTS idx_documents_subdomain ON public.documents(subdomain);
CREATE INDEX IF NOT EXISTS idx_documents_year ON public.documents(year);

-- Document Chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_version ON public.document_chunks(version_id);

-- Document Embeddings (HNSW para busca vetorial rápida)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_document ON public.document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON public.document_embeddings(chunk_id);

-- Chat Logs
CREATE INDEX IF NOT EXISTS idx_chat_logs_user ON public.chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON public.chat_logs(created_at DESC);

-- Chat Citations
CREATE INDEX IF NOT EXISTS idx_chat_citations_log ON public.chat_citations(chat_log_id);
CREATE INDEX IF NOT EXISTS idx_chat_citations_doc ON public.chat_citations(document_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 5: FUNÇÃO DE BUSCA VETORIAL (RAG)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_document_ids uuid[] DEFAULT NULL,
  filter_domain text DEFAULT NULL,
  filter_subdomain text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  document_type text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as chunk_id,
    d.id as document_id,
    d.name as document_name,
    d.document_type::text as document_type,
    dc.content,
    1 - (de.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'domain', d.domain,
      'subdomain', d.subdomain,
      'year', d.year,
      'education_stage', d.education_stage,
      'keywords', d.keywords
    ) as metadata
  FROM document_embeddings de
  JOIN document_chunks dc ON dc.id = de.chunk_id
  JOIN documents d ON d.id = de.document_id
  WHERE 
    d.status = 'ACTIVE'
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND (filter_document_ids IS NULL OR d.id = ANY(filter_document_ids))
    AND (filter_domain IS NULL OR d.domain = filter_domain)
    AND (filter_subdomain IS NULL OR d.subdomain = filter_subdomain)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 6: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_citations ENABLE ROW LEVEL SECURITY;

-- Policies: Service role tem acesso total (backend)
CREATE POLICY "Service role has full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.educational_units
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.user_units
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.document_versions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.document_chunks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.document_embeddings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.chat_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON public.chat_citations
  FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 7: CRIAR USUÁRIO ADMIN INICIAL
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ IMPORTANTE: Após rodar este SQL, você precisará criar o usuário no Supabase Auth
-- Por enquanto, só criamos a estrutura. O usuário será criado via backend depois.

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 8: STORAGE BUCKET (para documentos)
-- ═══════════════════════════════════════════════════════════════════════════

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Service role pode fazer upload
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'documents');

-- Policy: Service role pode ler documentos
CREATE POLICY "Service role can read documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SETUP COMPLETO!
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SETUP SUPABASE CONCLUÍDO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tabelas criadas:';
  RAISE NOTICE '   ✓ users';
  RAISE NOTICE '   ✓ educational_units';
  RAISE NOTICE '   ✓ user_units';
  RAISE NOTICE '   ✓ documents';
  RAISE NOTICE '   ✓ document_versions';
  RAISE NOTICE '   ✓ document_chunks';
  RAISE NOTICE '   ✓ document_embeddings';
  RAISE NOTICE '   ✓ chat_logs';
  RAISE NOTICE '   ✓ chat_citations';
  RAISE NOTICE '   ✓ document_indexing_jobs';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Índices criados para performance';
  RAISE NOTICE '🔐 Row Level Security habilitado';
  RAISE NOTICE '🎯 Função match_chunks() criada para RAG';
  RAISE NOTICE '📦 Storage bucket "documents" criado';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Próximo passo: Deploy do backend no Render';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
