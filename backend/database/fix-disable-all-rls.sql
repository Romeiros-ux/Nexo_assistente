-- ====================================
-- FIX: DESABILITAR RLS TEMPORARIAMENTE
-- ====================================
-- Para permitir upload de documentos sem
-- problemas de recursão nas políticas RLS
-- ====================================

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE educational_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_units DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'documents', 'educational_units', 'user_units')
ORDER BY tablename;

-- Resultado esperado: todas com rowsecurity = false
