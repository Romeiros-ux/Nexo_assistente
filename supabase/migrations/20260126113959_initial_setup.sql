-- ============================================================================
-- NEXO ASSISTENTE - Sistema de Assistente Educacional Virtual
-- Migração Inicial Completa
-- ============================================================================

-- 1. EXTENSÕES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Similaridade de texto

-- 2. TIPOS ENUMERADOS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('secretaria', 'ti', 'coordenacao', 'diretor');
CREATE TYPE public.document_status AS ENUM ('vigente', 'substituido', 'arquivado');

-- 3. TABELAS PRINCIPAIS
-- ============================================================================

-- 3.1 Unidades (escolas, secretarias, departamentos)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.units IS 'Unidades escolares e administrativas do município';

-- 3.2 Perfis de Usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.profiles IS 'Perfil dos usuários com dados complementares';
COMMENT ON COLUMN public.profiles.is_active IS 'Define se o usuário pode acessar o sistema';

-- 3.3 Roles dos Usuários (separado para evitar escalonamento de privilégios)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_roles IS 'Papéis dos usuários no sistema (pode ter múltiplos)';

-- 3.4 Documentos
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  status public.document_status NOT NULL DEFAULT 'vigente',
  effective_date DATE,
  min_role public.app_role NOT NULL DEFAULT 'diretor',
  
  -- Origem do documento
  source_type TEXT NOT NULL DEFAULT 'file',  -- 'file' | 'link'
  source_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  
  -- Classificação e metadados
  thematic_area TEXT,
  doc_kind TEXT,  -- 'normativo', 'relatorio', 'plano', etc.
  reference_year INTEGER,
  published_at DATE,
  valid_from DATE,
  valid_to DATE,
  
  -- Tags e palavras-chave
  tags_manual TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  keywords_manual TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  tags_auto TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  keywords_auto TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  
  -- Conteúdo e busca
  extracted_text TEXT,
  content_tsv TSVECTOR,
  group_key TEXT,
  attached_files_count INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.documents IS 'Metadados dos documentos institucionais';
COMMENT ON COLUMN public.documents.min_role IS 'Papel mínimo necessário para acessar o documento';
COMMENT ON COLUMN public.documents.extracted_text IS 'Texto extraído do documento para busca';
COMMENT ON COLUMN public.documents.content_tsv IS 'Vetor de busca full-text';
COMMENT ON COLUMN public.documents.group_key IS 'Agrupa documentos relacionados (mesma área temática)';

-- 3.5 Conversas do Chat
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.conversations IS 'Histórico de conversas dos usuários';

-- 3.6 Mensagens do Chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.chat_messages IS 'Mensagens individuais das conversas';

-- 3.7 Logs de Auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role,
  unit_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.audit_logs IS 'Registro de todas as ações relevantes do sistema';

-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_unit_id ON public.profiles(unit_id);

-- User Roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Documents
CREATE INDEX idx_documents_unit_id ON public.documents(unit_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_min_role ON public.documents(min_role);
CREATE INDEX idx_documents_thematic_area ON public.documents(thematic_area);
CREATE INDEX idx_documents_doc_kind ON public.documents(doc_kind);
CREATE INDEX idx_documents_reference_year ON public.documents(reference_year);
CREATE INDEX idx_documents_group_key ON public.documents(group_key);
CREATE INDEX idx_documents_title_trgm ON public.documents USING GIN (title gin_trgm_ops);
CREATE INDEX idx_documents_content_tsv ON public.documents USING GIN (content_tsv);

-- Conversations
CREATE INDEX idx_conversations_user_updated ON public.conversations(user_id, updated_at DESC);

-- Chat Messages
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- 5. FUNÇÕES AUXILIARES
-- ============================================================================

-- 5.1 Atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Atualiza automaticamente o campo updated_at';

-- 5.2 Verificar se usuário tem papel específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário possui determinado papel';

-- 5.3 Rank do papel (para hierarquia)
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'diretor' THEN 1
    WHEN 'coordenacao' THEN 2
    WHEN 'secretaria' THEN 3
    WHEN 'ti' THEN 4
  END
$$;

COMMENT ON FUNCTION public.role_rank IS 'Retorna o nível hierárquico do papel (menor = menos privilégios)';

-- 5.4 Maior rank do usuário
CREATE OR REPLACE FUNCTION public.user_max_role_rank(_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.role_rank(role)), 0)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

COMMENT ON FUNCTION public.user_max_role_rank IS 'Retorna o maior nível hierárquico do usuário';

-- 5.5 Papel principal do usuário
CREATE OR REPLACE FUNCTION public.user_primary_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY public.role_rank(role) DESC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.user_primary_role IS 'Retorna o papel principal (maior privilégio) do usuário';

-- 5.6 Unidade do usuário
CREATE OR REPLACE FUNCTION public.user_unit_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

COMMENT ON FUNCTION public.user_unit_id IS 'Retorna a unidade vinculada ao usuário';

-- 5.7 Verificar acesso a documento
CREATE OR REPLACE FUNCTION public.can_access_document(_user_id UUID, _doc_unit_id UUID, _min_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- TI tem acesso total
    public.has_role(_user_id, 'ti')
    OR (
      -- Usuário ativo
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id AND p.is_active = TRUE)
      AND
      -- Papel mínimo
      public.user_max_role_rank(_user_id) >= public.role_rank(_min_role)
      AND
      -- Escopo: global (unit_id NULL) ou unidade do usuário ou secretaria/coordenação
      (
        _doc_unit_id IS NULL
        OR _doc_unit_id = public.user_unit_id(_user_id)
        OR public.user_max_role_rank(_user_id) >= public.role_rank('secretaria')
      )
    )
$$;

COMMENT ON FUNCTION public.can_access_document IS 'Verifica se usuário pode acessar documento baseado em papel e unidade';

-- 5.8 Criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Cria perfil automaticamente quando usuário se registra';

-- 5.9 Enriquecer audit log com dados do usuário
CREATE OR REPLACE FUNCTION public.audit_enrich()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.role := public.user_primary_role(auth.uid());
  NEW.unit_id := public.user_unit_id(auth.uid());
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_enrich IS 'Enriquece logs de auditoria com dados do usuário automaticamente';

-- 5.10 Atualizar vetor de busca full-text
CREATE OR REPLACE FUNCTION public.documents_refresh_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.extracted_text IS NOT NULL THEN
    NEW.content_tsv := to_tsvector('portuguese', 
      COALESCE(NEW.title, '') || ' ' ||
      COALESCE(NEW.description, '') || ' ' ||
      COALESCE(NEW.thematic_area, '') || ' ' ||
      COALESCE(NEW.extracted_text, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.documents_refresh_tsv IS 'Atualiza o vetor de busca full-text do documento';

-- 5.11 Buscar trechos relevantes em documentos grandes
CREATE OR REPLACE FUNCTION public.search_document_snippets(
  _needle TEXT,
  _limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  snippet TEXT,
  match_pos INT
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT
    d.id,
    d.title,
    SUBSTRING(
      d.extracted_text
      FROM GREATEST(STRPOS(LOWER(d.extracted_text), LOWER(_needle)) - 400, 1)
      FOR 2400
    ) AS snippet,
    STRPOS(LOWER(d.extracted_text), LOWER(_needle)) AS match_pos
  FROM public.documents d
  WHERE d.status = 'vigente'::public.document_status
    AND d.extracted_text IS NOT NULL
    AND LENGTH(TRIM(_needle)) > 0
    AND STRPOS(LOWER(d.extracted_text), LOWER(_needle)) > 0
    AND public.can_access_document(auth.uid(), d.unit_id, d.min_role)
  ORDER BY match_pos ASC
  LIMIT GREATEST(COALESCE(_limit, 5), 1);
$$;

COMMENT ON FUNCTION public.search_document_snippets IS 'Busca trechos relevantes dentro de documentos sem retornar texto completo';

-- 5.12 Encontrar documentos similares
CREATE OR REPLACE FUNCTION public.find_similar_documents(
  _title TEXT,
  _type TEXT,
  _thematic_area TEXT,
  _unit_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  version TEXT,
  status document_status,
  published_at DATE,
  effective_date DATE,
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.version,
    d.status,
    d.published_at,
    d.effective_date,
    d.created_at,
    (
      CASE WHEN LOWER(d.title) = LOWER(_title) THEN 0.5 ELSE 0.0 END +
      CASE WHEN d.type = _type THEN 0.2 ELSE 0.0 END +
      CASE WHEN d.thematic_area IS NOT NULL AND LOWER(d.thematic_area) = LOWER(_thematic_area) THEN 0.2 ELSE 0.0 END +
      CASE WHEN d.unit_id = _unit_id OR (d.unit_id IS NULL AND _unit_id IS NULL) THEN 0.1 ELSE 0.0 END
    )::NUMERIC AS similarity
  FROM documents d
  WHERE d.type = _type
    AND (
      LOWER(d.title) = LOWER(_title)
      OR (d.thematic_area IS NOT NULL AND _thematic_area IS NOT NULL AND LOWER(d.thematic_area) = LOWER(_thematic_area))
    )
  ORDER BY similarity DESC, d.created_at DESC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION public.find_similar_documents IS 'Encontra documentos similares baseado em título, tipo e área temática';

-- 6. TRIGGERS
-- ============================================================================

-- 6.1 Timestamps automáticos
CREATE TRIGGER tr_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6.2 Criar perfil automaticamente ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6.3 Enriquecer audit logs
CREATE TRIGGER tr_audit_enrich
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enrich();

-- 6.4 Atualizar vetor de busca em documentos
CREATE TRIGGER tr_documents_tsv
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  WHEN (NEW.extracted_text IS NOT NULL)
  EXECUTE FUNCTION public.documents_refresh_tsv();

-- 7. ROW LEVEL SECURITY (RLS) - POLÍTICAS
-- ============================================================================

-- 7.1 Units
CREATE POLICY "Units: read authenticated"
  ON public.units FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Units: write only TI"
  ON public.units FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ti'))
  WITH CHECK (public.has_role(auth.uid(), 'ti'));

-- 7.2 Profiles
CREATE POLICY "Profiles: self read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Profiles: TI read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ti'));

CREATE POLICY "Profiles: self update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles: no direct insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

-- 7.3 User Roles
CREATE POLICY "Roles: self read"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Roles: TI manage"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ti'))
  WITH CHECK (public.has_role(auth.uid(), 'ti'));

-- 7.4 Documents
CREATE POLICY "Documents: read by permission"
  ON public.documents FOR SELECT
  TO authenticated
  USING (public.can_access_document(auth.uid(), unit_id, min_role));

CREATE POLICY "Documents: TI write"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ti'))
  WITH CHECK (public.has_role(auth.uid(), 'ti'));

-- 7.5 Conversations
CREATE POLICY "Conversations: self read"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Conversations: self insert"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Conversations: self update"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Conversations: self delete"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7.6 Chat Messages
CREATE POLICY "Messages: self read"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Messages: self insert"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 7.7 Audit Logs
CREATE POLICY "Audit: insert only active users"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
        AND is_active = TRUE
    )
  );

CREATE POLICY "Audit: TI read"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ti'));

-- 8. STORAGE
-- ============================================================================

-- Bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao storage
CREATE POLICY "Documents Storage: TI upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' 
    AND public.has_role(auth.uid(), 'ti')
  );

CREATE POLICY "Documents Storage: TI read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Documents Storage: TI delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' 
    AND public.has_role(auth.uid(), 'ti')
  );

-- 9. DADOS INICIAIS (SEEDS)
-- ============================================================================

-- Unidade padrão (Global)
INSERT INTO public.units (code, name)
VALUES ('GLOBAL', 'Secretaria Municipal de Educação')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- FIM DA MIGRAÇÃO INICIAL
-- ============================================================================
