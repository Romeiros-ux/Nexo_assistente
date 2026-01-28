/**
 * Script para criar usuário TI no Supabase
 * 
 * Execute este SQL no Supabase SQL Editor:
 * https://supabase.com/dashboard/project/edtsrirqtgsjphlmuwui/sql
 */

-- =====================================================
-- CRIAR USUÁRIO TI
-- =====================================================

-- 1. Deletar usuário antigo se existir
DELETE FROM users WHERE email = 'ti@educacao.gov.br';

-- 2. Criar usuário TI
-- Email: ti@educacao.gov.br
-- Senha: senha_super_secreta_ti_2024
-- Hash bcrypt gerado com bcrypt.hash('senha_super_secreta_ti_2024', 10)
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Equipe de TI',
  'ti@educacao.gov.br',
  '$2b$10$EO52eHY0Fj1.swjcEQW6DOzFLs.YPPNrTp9d1smBxdWBjTWHfQAlC',
  'TI',
  'active'
);

-- =====================================================
-- VERIFICAR CRIAÇÃO
-- =====================================================

SELECT 
  id,
  name,
  email,
  role,
  status,
  created_at
FROM users
WHERE email = 'ti@educacao.gov.br';

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- O hash acima é um exemplo. Para gerar o hash correto,
-- use uma das opções abaixo:

-- OPÇÃO 1: Via Backend (RECOMENDADO)
-- Execute este comando no backend local:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('senha_super_secreta_ti_2024', 10).then(console.log)"

-- OPÇÃO 2: Via API
-- POST /api/v1/auth/register
-- Body: { "name": "Equipe de TI", "email": "ti@educacao.gov.br", "password": "senha_super_secreta_ti_2024", "role": "TI" }
