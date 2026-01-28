-- ====================================
-- FIX: DESABILITAR RLS DA TABELA USERS
-- ====================================
-- Causa: Recursão infinita nas políticas RLS
-- As políticas de documents/storage verificam users
-- e as políticas de users verificam users novamente
-- ====================================

-- Solução temporária: Desabilitar RLS em users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Resultado esperado:
-- tablename | rowsecurity
-- ----------+-------------
-- users     | false
