-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 SCRIPT PARA REMOVER TODAS AS POLICIES RLS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ⚠️ ATENÇÃO: Execute este script SOMENTE se as tabelas já existirem!
-- Use este script se precisar limpar todas as policies antes de recriar
-- 
-- ALTERNATIVA: Execute schema-completo-supabase.sql diretamente
-- (ele já tem DROP POLICY IF EXISTS integrado e é idempotente)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- USERS policies
  DROP POLICY IF EXISTS "ti_select_all_users" ON users;
  DROP POLICY IF EXISTS "users_select_own" ON users;
  DROP POLICY IF EXISTS "ti_insert_users" ON users;
  DROP POLICY IF EXISTS "ti_update_users" ON users;
  DROP POLICY IF EXISTS "users_update_own" ON users;
  DROP POLICY IF EXISTS "ti_delete_users" ON users;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela users não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- EDUCATIONAL_UNITS policies
  DROP POLICY IF EXISTS "ti_secretaria_select_all_units" ON educational_units;
  DROP POLICY IF EXISTS "comissao_select_all_units" ON educational_units;
  DROP POLICY IF EXISTS "diretor_coordenacao_select_own_units" ON educational_units;
  DROP POLICY IF EXISTS "ti_insert_units" ON educational_units;
  DROP POLICY IF EXISTS "ti_update_units" ON educational_units;
  DROP POLICY IF EXISTS "ti_delete_units" ON educational_units;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela educational_units não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- USER_UNITS policies
  DROP POLICY IF EXISTS "ti_select_all_user_units" ON user_units;
  DROP POLICY IF EXISTS "users_select_own_units" ON user_units;
  DROP POLICY IF EXISTS "ti_insert_user_units" ON user_units;
  DROP POLICY IF EXISTS "ti_delete_user_units" ON user_units;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela user_units não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- DOCUMENTS policies
  DROP POLICY IF EXISTS "all_select_public_documents" ON documents;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_documents" ON documents;
  DROP POLICY IF EXISTS "ti_secretaria_insert_documents" ON documents;
  DROP POLICY IF EXISTS "ti_secretaria_update_documents" ON documents;
  DROP POLICY IF EXISTS "ti_delete_documents" ON documents;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela documents não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- EXTERNAL_SOURCES policies
  DROP POLICY IF EXISTS "all_select_authorized_sources" ON external_sources;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_sources" ON external_sources;
  DROP POLICY IF EXISTS "ti_secretaria_manage_sources" ON external_sources;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela external_sources não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- CONVERSATIONS policies
  DROP POLICY IF EXISTS "users_select_own_conversations" ON conversations;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_conversations" ON conversations;
  DROP POLICY IF EXISTS "users_insert_own_conversations" ON conversations;
  DROP POLICY IF EXISTS "users_update_own_conversations" ON conversations;
  DROP POLICY IF EXISTS "users_delete_own_conversations" ON conversations;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela conversations não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- MESSAGES policies
  DROP POLICY IF EXISTS "users_select_own_messages" ON messages;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_messages" ON messages;
  DROP POLICY IF EXISTS "users_insert_own_messages" ON messages;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela messages não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- ANALYTICS_SESSIONS policies
  DROP POLICY IF EXISTS "users_select_own_analytics" ON analytics_sessions;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_analytics" ON analytics_sessions;
  DROP POLICY IF EXISTS "users_insert_own_analytics" ON analytics_sessions;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela analytics_sessions não existe, pulando...';
END $$;

DO $$ 
BEGIN
  -- ACTION_PLANS policies
  DROP POLICY IF EXISTS "users_select_own_action_plans" ON action_plans;
  DROP POLICY IF EXISTS "ti_secretaria_select_all_action_plans" ON action_plans;
  DROP POLICY IF EXISTS "diretor_coordenacao_select_unit_action_plans" ON action_plans;
  DROP POLICY IF EXISTS "users_insert_own_action_plans" ON action_plans;
  DROP POLICY IF EXISTS "users_update_own_action_plans" ON action_plans;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'Tabela action_plans não existe, pulando...';
END $$;
