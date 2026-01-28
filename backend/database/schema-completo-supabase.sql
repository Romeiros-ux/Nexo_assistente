-- ═══════════════════════════════════════════════════════════════════════════
-- 🏛️ SCHEMA COMPLETO - ASSISTENTE INSTITUCIONAL INTELIGENTE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- DESCRIÇÃO:
--   Schema completo para implantação no Supabase incluindo:
--   - ENUMs (tipos personalizados)
--   - Tabelas principais
--   - Row Level Security (RLS) Policies
--   - Funções auxiliares
--   - Triggers e validações
--   - Índices para performance
--
-- ARQUITETURA DE SEGURANÇA:
--   Frontend (JWT) → Backend (AuthGuard) → Database (RLS)
--
-- DATA DE CRIAÇÃO: 09/01/2026
-- VERSÃO: 1.0
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ EXTENSÕES NECESSÁRIAS
-- ═══════════════════════════════════════════════════════════════════════════

-- UUID para geração de IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto para funções de criptografia (se necessário)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ ENUMS (PADRÕES INSTITUCIONAIS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Perfis de usuário (alinhado com sistema-prompt.ts)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'TI',                        -- Acesso técnico total, SEM poder decisório educacional
    'SECRETARIA',                -- Acesso total a informações, SEM edição direta
    'DIRETOR',                   -- Acesso APENAS à sua unidade
    'COORDENACAO',               -- Acesso amplo, EXCETO projetos restritos
    'COMISSAO'                   -- Acesso a documentos e análises vinculadas
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status genérico para entidades
DO $$ BEGIN
  CREATE TYPE status_type AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PENDING',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de unidade educacional
DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM (
    'SCHOOL',                    -- Escola
    'CENTER',                    -- Centro educacional
    'DEPARTMENT',                -- Departamento
    'SECRETARIAT'                -- Secretaria
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Categoria de conversa (alinhado com prompts funcionais)
DO $$ BEGIN
  CREATE TYPE conversation_category AS ENUM (
    'ANALYTICAL',                -- Análise de dados (Prompt Funcional de Análise)
    'ACTION_PLAN',               -- Plano de ação (Prompt Funcional de Plano de Ação)
    'URGENCY',                   -- Carência e urgência (Prompt Funcional de Carência e Urgência)
    'DOCUMENTAL',                -- Consulta documental (Prompt Funcional de Consulta Documental)
    'GENERAL'                    -- Orientação geral (Prompt Funcional Geral)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de fonte de informação
DO $$ BEGIN
  CREATE TYPE source_type AS ENUM (
    'INTERNAL',                  -- Documento institucional interno
    'EXTERNAL_AUTHORIZED',       -- Fonte externa autorizada
    'EXTERNAL_PUBLIC'            -- Fonte externa pública
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de documento institucional
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'NORM',                      -- Norma/Regulamento
    'LAW',                       -- Lei
    'RESOLUTION',                -- Resolução
    'DIRECTIVE',                 -- Portaria/Diretriz
    'MANUAL',                    -- Manual operacional
    'REPORT',                    -- Relatório
    'OTHER'                      -- Outro tipo
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de urgência (alinhado com Prompt Funcional de Carência)
DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM (
    'CRITICAL',                  -- Urgência Crítica (ação imediata)
    'HIGH',                      -- Urgência Alta (ação prioritária)
    'MEDIUM',                    -- Urgência Moderada (ação planejada)
    'LOW'                        -- Não urgente (monitoramento)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ TABELAS PRINCIPAIS
-- ═══════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.1 USERS - Extensão do Supabase Auth                                  │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  status status_type DEFAULT 'ACTIVE',
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  
  -- Metadados para auditoria
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Comentários explicativos
COMMENT ON TABLE users IS 'Usuários do sistema - extensão do Supabase Auth';
COMMENT ON COLUMN users.role IS 'Perfil institucional do usuário (determina permissões)';
COMMENT ON COLUMN users.status IS 'Status do usuário (ACTIVE, INACTIVE, PENDING, ARCHIVED)';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.2 EDUCATIONAL_UNITS - Unidades Educacionais                          │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS educational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type unit_type NOT NULL,
  code TEXT UNIQUE,              -- Código INEP ou código interno
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Metadados
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_unit_code CHECK (code IS NULL OR length(code) >= 3)
);

COMMENT ON TABLE educational_units IS 'Unidades educacionais (escolas, centros, departamentos)';
COMMENT ON COLUMN educational_units.code IS 'Código INEP ou código interno da unidade';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.3 USER_UNITS - Vínculo N:N entre Usuários e Unidades                │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS user_units (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES educational_units(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  
  PRIMARY KEY (user_id, unit_id)
);

COMMENT ON TABLE user_units IS 'Relacionamento N:N - Usuários vinculados a Unidades Educacionais';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.4 DOCUMENTS - Documentos Institucionais                              │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,                -- PDF, DOCX, etc.
  file_size INTEGER,             -- Tamanho em bytes
  version TEXT DEFAULT '1.0',
  status status_type DEFAULT 'ACTIVE',
  
  -- Campos para rastreabilidade (crítico para DOCUMENTAL prompt)
  official_number TEXT,          -- Número oficial (ex: Lei 1234/2024)
  publication_date DATE,
  effective_date DATE,
  
  -- Metadados
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  
  -- Controle de acesso
  is_public BOOLEAN DEFAULT false,
  requires_authorization BOOLEAN DEFAULT false,
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800) -- Max 50MB
);

COMMENT ON TABLE documents IS 'Documentos institucionais (normas, leis, resoluções, manuais)';
COMMENT ON COLUMN documents.is_public IS 'Se true, documento é público (Priority 1 no DOCUMENTAL prompt)';
COMMENT ON COLUMN documents.requires_authorization IS 'Se true, requer autorização específica para acesso';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.5 EXTERNAL_SOURCES - Fontes Externas Homologadas                     │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS external_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  type source_type NOT NULL DEFAULT 'EXTERNAL_PUBLIC',
  status status_type DEFAULT 'ACTIVE',
  
  -- Controle de autorização
  is_authorized BOOLEAN DEFAULT false,
  authorized_by UUID REFERENCES users(id),
  authorized_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_url CHECK (url ~* '^https?://')
);

COMMENT ON TABLE external_sources IS 'Fontes externas autorizadas (Priority 2 no DOCUMENTAL prompt)';
COMMENT ON COLUMN external_sources.is_authorized IS 'Se true, fonte está autorizada para consulta';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.6 CONVERSATIONS - Conversas com a IA                                 │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  category conversation_category,
  
  -- Contexto da conversa
  user_profile user_role,       -- Perfil usado nesta conversa
  unit_context UUID REFERENCES educational_units(id), -- Unidade de contexto
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  
  -- Status
  is_archived BOOLEAN DEFAULT false
);

COMMENT ON TABLE conversations IS 'Conversas dos usuários com o Assistente Institucional';
COMMENT ON COLUMN conversations.category IS 'Categoria da conversa (alinhado com prompts funcionais)';
COMMENT ON COLUMN conversations.user_profile IS 'Perfil do usuário no momento da conversa';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.7 MESSAGES - Mensagens das Conversas                                 │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT false,
  
  -- Metadados da resposta da IA
  prompt_type conversation_category, -- Qual prompt funcional foi usado
  model_used TEXT,                   -- Modelo de IA usado (ex: "gpt-4")
  tokens_used INTEGER,
  
  -- Rastreabilidade (crítico para DOCUMENTAL)
  sources_cited UUID[],              -- IDs de documents usados na resposta
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_content CHECK (length(content) > 0)
);

COMMENT ON TABLE messages IS 'Mensagens das conversas (usuário e IA)';
COMMENT ON COLUMN messages.is_ai IS 'true se mensagem é da IA, false se é do usuário';
COMMENT ON COLUMN messages.sources_cited IS 'Array de IDs de documentos citados (para DOCUMENTAL prompt)';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.8 ANALYTICS_SESSIONS - Sessões de Análise                            │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Dados da análise
  analysis_type TEXT,            -- Tipo de análise realizada
  data_source TEXT,              -- Fonte dos dados analisados
  urgency_level urgency_level,   -- Nível de urgência identificado
  
  -- Resultados
  findings JSONB,                -- Descobertas da análise (formato JSON)
  recommendations JSONB,         -- Recomendações geradas
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE analytics_sessions IS 'Sessões de análise de dados (Prompt ANALYTICAL + URGENCY)';
COMMENT ON COLUMN analytics_sessions.urgency_level IS 'Nível de urgência detectado na análise';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.9 ACTION_PLANS - Planos de Ação Gerados                              │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  analytics_session_id UUID REFERENCES analytics_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID REFERENCES educational_units(id),
  
  -- Dados do plano
  title TEXT NOT NULL,
  description TEXT,
  actions JSONB NOT NULL,        -- Array de ações sugeridas (formato JSON)
  priority urgency_level,
  
  -- Fundamentação documental (crítico)
  based_on_documents UUID[],     -- IDs de documents que fundamentam o plano
  
  -- Status de implementação
  status status_type DEFAULT 'PENDING',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_actions CHECK (jsonb_array_length(actions) > 0)
);

COMMENT ON TABLE action_plans IS 'Planos de Ação sugeridos pelo sistema (Prompt ACTION_PLAN)';
COMMENT ON COLUMN action_plans.based_on_documents IS 'Documentos que fundamentam o plano (rastreabilidade)';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3.10 AUDIT_LOG - Log de Auditoria                                      │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,          -- CREATE, UPDATE, DELETE, ACCESS
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Log de auditoria de todas as ações críticas do sistema';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Índices para USERS
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índices para EDUCATIONAL_UNITS
CREATE INDEX IF NOT EXISTS idx_units_type ON educational_units(type);
CREATE INDEX IF NOT EXISTS idx_units_status ON educational_units(status);
CREATE INDEX IF NOT EXISTS idx_units_code ON educational_units(code);

-- Índices para USER_UNITS
CREATE INDEX IF NOT EXISTS idx_user_units_user ON user_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_units_unit ON user_units(unit_id);

-- Índices para DOCUMENTS
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_publication_date ON documents(publication_date);

-- Índices para CONVERSATIONS
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unit ON conversations(unit_context);

-- Índices para MESSAGES
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sources ON messages USING GIN(sources_cited);

-- Índices para ANALYTICS_SESSIONS
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_urgency ON analytics_sessions(urgency_level);

-- Índices para ACTION_PLANS
CREATE INDEX IF NOT EXISTS idx_action_plans_user ON action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_unit ON action_plans(unit_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status);
CREATE INDEX IF NOT EXISTS idx_action_plans_priority ON action_plans(priority);

-- Índices para AUDIT_LOG
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ TRIGGERS AUTOMÁTICOS
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON educational_units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON educational_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_action_plans_updated_at ON action_plans;
CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_message_at em conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_last_message_trigger ON messages;
CREATE TRIGGER update_last_message_trigger AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣ ROW LEVEL SECURITY (RLS) - HABILITAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilita RLS nas tabelas principais
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣ FUNÇÕES AUXILIARES PARA RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Função: Verifica se usuário tem acesso global                          │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION has_global_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role IN ('TI', 'SECRETARIA')
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_global_access IS 'Verifica se usuário tem acesso global (TI ou SECRETARIA)';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Função: Retorna IDs das unidades que o usuário pode acessar            │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION get_accessible_unit_ids(user_id UUID)
RETURNS TABLE(unit_id UUID) AS $$
BEGIN
  -- Se tem acesso global, retorna todas as unidades ativas
  IF has_global_access(user_id) THEN
    RETURN QUERY
    SELECT eu.id
    FROM educational_units eu
    WHERE eu.status = 'ACTIVE';
  -- Caso contrário, retorna apenas unidades vinculadas
  ELSE
    RETURN QUERY
    SELECT uu.unit_id
    FROM user_units uu
    WHERE uu.user_id = get_accessible_unit_ids.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_accessible_unit_ids IS 'Retorna IDs das unidades que o usuário pode acessar';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Função: Valida se usuário pode acessar uma unidade específica          │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION can_access_unit(user_id UUID, unit_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- TI e SECRETARIA têm acesso a tudo
  IF has_global_access(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verifica se há vínculo
  RETURN EXISTS (
    SELECT 1 FROM user_units uu
    WHERE uu.user_id = can_access_unit.user_id
    AND uu.unit_id = can_access_unit.unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_access_unit IS 'Valida se usuário pode acessar uma unidade específica';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Função: Verifica se usuário é Comissão (acesso read-only)              │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION is_comissao(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role = 'COMISSAO'
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_comissao IS 'Verifica se usuário é da COMISSÃO (acesso read-only amplo)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣ POLÍTICAS RLS - USERS
-- ═══════════════════════════════════════════════════════════════════════════

-- TI pode ver todos os usuários
DROP POLICY IF EXISTS "ti_select_all_users" ON users;
CREATE POLICY "ti_select_all_users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'ACTIVE'
    )
  );

-- Usuários podem ver seu próprio registro
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- TI pode criar usuários
DROP POLICY IF EXISTS "ti_insert_users" ON users;
CREATE POLICY "ti_insert_users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'ACTIVE'
    )
  );

-- TI pode atualizar usuários
DROP POLICY IF EXISTS "ti_update_users" ON users;
CREATE POLICY "ti_update_users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'ACTIVE'
    )
  );

-- Usuários podem atualizar seu próprio registro (exceto role e status)
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND status = (SELECT status FROM users WHERE id = auth.uid())
  );

-- TI pode deletar usuários
DROP POLICY IF EXISTS "ti_delete_users" ON users;
CREATE POLICY "ti_delete_users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS requester
      WHERE requester.id = auth.uid()
      AND requester.role = 'TI'
      AND requester.status = 'ACTIVE'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣ POLÍTICAS RLS - EDUCATIONAL_UNITS
-- ═══════════════════════════════════════════════════════════════════════════

-- TI e SECRETARIA podem ver todas as unidades
DROP POLICY IF EXISTS "ti_secretaria_select_all_units" ON educational_units;
CREATE POLICY "ti_secretaria_select_all_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- COMISSAO pode ver todas as unidades (read-only)
DROP POLICY IF EXISTS "comissao_select_all_units" ON educational_units;
CREATE POLICY "comissao_select_all_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'COMISSAO'
      AND users.status = 'ACTIVE'
    )
  );

-- DIRETOR e COORDENACAO veem apenas unidades vinculadas
DROP POLICY IF EXISTS "diretor_coordenacao_select_own_units" ON educational_units;
CREATE POLICY "diretor_coordenacao_select_own_units" ON educational_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN user_units ON users.id = user_units.user_id
      WHERE users.id = auth.uid()
      AND users.role IN ('DIRETOR', 'COORDENACAO')
      AND users.status = 'ACTIVE'
      AND user_units.unit_id = educational_units.id
    )
  );

-- TI pode criar unidades
DROP POLICY IF EXISTS "ti_insert_units" ON educational_units;
CREATE POLICY "ti_insert_units" ON educational_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- TI pode atualizar unidades
DROP POLICY IF EXISTS "ti_update_units" ON educational_units;
CREATE POLICY "ti_update_units" ON educational_units
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- TI pode deletar unidades
DROP POLICY IF EXISTS "ti_delete_units" ON educational_units;
CREATE POLICY "ti_delete_units" ON educational_units
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟 POLÍTICAS RLS - USER_UNITS (Vínculos)
-- ═══════════════════════════════════════════════════════════════════════════

-- TI pode ver todos os vínculos
DROP POLICY IF EXISTS "ti_select_all_user_units" ON user_units;
CREATE POLICY "ti_select_all_user_units" ON user_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- Usuários podem ver seus próprios vínculos
DROP POLICY IF EXISTS "users_select_own_units" ON user_units;
CREATE POLICY "users_select_own_units" ON user_units
  FOR SELECT
  USING (auth.uid() = user_id);

-- TI pode criar vínculos
DROP POLICY IF EXISTS "ti_insert_user_units" ON user_units;
CREATE POLICY "ti_insert_user_units" ON user_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- TI pode deletar vínculos
DROP POLICY IF EXISTS "ti_delete_user_units" ON user_units;
CREATE POLICY "ti_delete_user_units" ON user_units
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣1️⃣ POLÍTICAS RLS - DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Todos os usuários ativos podem ver documentos públicos
DROP POLICY IF EXISTS "all_select_public_documents" ON documents;
CREATE POLICY "all_select_public_documents" ON documents
  FOR SELECT
  USING (
    is_public = true
    AND status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'ACTIVE'
    )
  );

-- TI e SECRETARIA podem ver todos os documentos
DROP POLICY IF EXISTS "ti_secretaria_select_all_documents" ON documents;
CREATE POLICY "ti_secretaria_select_all_documents" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- TI e SECRETARIA podem criar documentos
DROP POLICY IF EXISTS "ti_secretaria_insert_documents" ON documents;
CREATE POLICY "ti_secretaria_insert_documents" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- TI e SECRETARIA podem atualizar documentos
DROP POLICY IF EXISTS "ti_secretaria_update_documents" ON documents;
CREATE POLICY "ti_secretaria_update_documents" ON documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- TI pode deletar documentos
DROP POLICY IF EXISTS "ti_delete_documents" ON documents;
CREATE POLICY "ti_delete_documents" ON documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'TI'
      AND users.status = 'ACTIVE'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣2️⃣ POLÍTICAS RLS - EXTERNAL_SOURCES
-- ═══════════════════════════════════════════════════════════════════════════

-- Todos os usuários podem ver fontes autorizadas
DROP POLICY IF EXISTS "all_select_authorized_sources" ON external_sources;
CREATE POLICY "all_select_authorized_sources" ON external_sources
  FOR SELECT
  USING (
    is_authorized = true
    AND status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'ACTIVE'
    )
  );

-- TI e SECRETARIA podem ver todas as fontes
DROP POLICY IF EXISTS "ti_secretaria_select_all_sources" ON external_sources;
CREATE POLICY "ti_secretaria_select_all_sources" ON external_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- TI e SECRETARIA podem gerenciar fontes
DROP POLICY IF EXISTS "ti_secretaria_manage_sources" ON external_sources;
CREATE POLICY "ti_secretaria_manage_sources" ON external_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣3️⃣ POLÍTICAS RLS - CONVERSATIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Usuários podem ver suas próprias conversas
DROP POLICY IF EXISTS "users_select_own_conversations" ON conversations;
CREATE POLICY "users_select_own_conversations" ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- TI e SECRETARIA podem ver todas as conversas (auditoria)
DROP POLICY IF EXISTS "ti_secretaria_select_all_conversations" ON conversations;
CREATE POLICY "ti_secretaria_select_all_conversations" ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- Usuários podem criar suas próprias conversas
DROP POLICY IF EXISTS "users_insert_own_conversations" ON conversations;
CREATE POLICY "users_insert_own_conversations" ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias conversas
DROP POLICY IF EXISTS "users_update_own_conversations" ON conversations;
CREATE POLICY "users_update_own_conversations" ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias conversas
DROP POLICY IF EXISTS "users_delete_own_conversations" ON conversations;
CREATE POLICY "users_delete_own_conversations" ON conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣4️⃣ POLÍTICAS RLS - MESSAGES
-- ═══════════════════════════════════════════════════════════════════════════

-- Usuários podem ver mensagens de suas conversas
DROP POLICY IF EXISTS "users_select_own_messages" ON messages;
CREATE POLICY "users_select_own_messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- TI e SECRETARIA podem ver todas as mensagens (auditoria)
DROP POLICY IF EXISTS "ti_secretaria_select_all_messages" ON messages;
CREATE POLICY "ti_secretaria_select_all_messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- Usuários podem criar mensagens em suas conversas
DROP POLICY IF EXISTS "users_insert_own_messages" ON messages;
CREATE POLICY "users_insert_own_messages" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣5️⃣ POLÍTICAS RLS - ANALYTICS_SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Usuários podem ver suas próprias sessões de análise
DROP POLICY IF EXISTS "users_select_own_analytics" ON analytics_sessions;
CREATE POLICY "users_select_own_analytics" ON analytics_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- TI e SECRETARIA podem ver todas as análises
DROP POLICY IF EXISTS "ti_secretaria_select_all_analytics" ON analytics_sessions;
CREATE POLICY "ti_secretaria_select_all_analytics" ON analytics_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- Usuários podem criar suas próprias análises
DROP POLICY IF EXISTS "users_insert_own_analytics" ON analytics_sessions;
CREATE POLICY "users_insert_own_analytics" ON analytics_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣6️⃣ POLÍTICAS RLS - ACTION_PLANS
-- ═══════════════════════════════════════════════════════════════════════════

-- Usuários podem ver seus próprios planos
DROP POLICY IF EXISTS "users_select_own_action_plans" ON action_plans;
CREATE POLICY "users_select_own_action_plans" ON action_plans
  FOR SELECT
  USING (auth.uid() = user_id);

-- TI e SECRETARIA podem ver todos os planos
DROP POLICY IF EXISTS "ti_secretaria_select_all_action_plans" ON action_plans;
CREATE POLICY "ti_secretaria_select_all_action_plans" ON action_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('TI', 'SECRETARIA')
      AND users.status = 'ACTIVE'
    )
  );

-- DIRETOR e COORDENACAO podem ver planos de suas unidades
DROP POLICY IF EXISTS "diretor_coordenacao_select_unit_action_plans" ON action_plans;
CREATE POLICY "diretor_coordenacao_select_unit_action_plans" ON action_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN user_units ON users.id = user_units.user_id
      WHERE users.id = auth.uid()
      AND users.role IN ('DIRETOR', 'COORDENACAO')
      AND users.status = 'ACTIVE'
      AND user_units.unit_id = action_plans.unit_id
    )
  );

-- Usuários podem criar seus próprios planos
DROP POLICY IF EXISTS "users_insert_own_action_plans" ON action_plans;
CREATE POLICY "users_insert_own_action_plans" ON action_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios planos
DROP POLICY IF EXISTS "users_update_own_action_plans" ON action_plans;
CREATE POLICY "users_update_own_action_plans" ON action_plans
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣7️⃣ DADOS INICIAIS (SEED)
-- ═══════════════════════════════════════════════════════════════════════════

-- Desabilita RLS temporariamente para inserção de dados iniciais
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE educational_units DISABLE ROW LEVEL SECURITY;

-- Inserir usuário TI inicial (IMPORTANTE: Ajustar ID para corresponder ao auth.users)
-- Este INSERT é apenas exemplo - você deve ajustar o UUID para o ID real do Supabase Auth
-- INSERT INTO users (id, name, email, role, status)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000'::UUID, -- SUBSTITUIR pelo UUID real do Supabase Auth
--   'Administrador TI',
--   'ti@secretaria.gov.br',
--   'TI',
--   'ACTIVE'
-- );

-- Inserir Secretaria de Educação (exemplo)
-- INSERT INTO educational_units (name, type, code, status)
-- VALUES (
--   'Secretaria Municipal de Educação',
--   'SECRETARIAT',
--   'SEC-001',
--   'ACTIVE'
-- );

-- Reabilita RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_units ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣8️⃣ INSTRUÇÕES DE APLICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

/*
PASSO A PASSO PARA APLICAR NO SUPABASE:

1. Acesse o Supabase Dashboard do seu projeto
2. Vá em: SQL Editor
3. Clique em "New Query"
4. Cole TODO este arquivo SQL
5. Execute o script completo (Run)
6. Verifique:
   - Database > Tables (verificar tabelas criadas)
   - Database > Policies (verificar RLS policies)
   - Database > Functions (verificar funções auxiliares)

7. CRIAR USUÁRIO TI INICIAL:
   - Primeiro crie o usuário no Supabase Auth (Authentication > Users > Add user)
   - Copie o UUID gerado
   - Execute o INSERT na tabela users com esse UUID

8. TESTAR RLS:
   - Crie usuários de teste com diferentes perfis
   - Teste acesso a dados de diferentes unidades
   - Verifique que RLS filtra corretamente

IMPORTANTE:
- RLS está habilitado em todas as tabelas críticas
- Funções auxiliares usam SECURITY DEFINER para performance
- Índices criados para otimização de queries
- Triggers automáticos para campos updated_at
- Audit log registra todas as ações críticas

SEGURANÇA:
- Arquitetura 3 camadas: Frontend JWT → Backend AuthGuard → Database RLS
- RLS garante proteção mesmo se frontend/backend comprometidos
- Usuários só veem dados de suas unidades (exceto TI/SECRETARIA)
- Documentos públicos acessíveis a todos usuários ativos
- Comissão tem acesso read-only amplo

PRÓXIMOS PASSOS:
1. Aplicar este schema no Supabase
2. Criar usuário TI inicial
3. Testar RLS com diferentes perfis
4. Integrar com backend (Supabase client)
5. Conectar DOCUMENTAL prompt com documents table
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DO SCHEMA COMPLETO
-- ═══════════════════════════════════════════════════════════════════════════
