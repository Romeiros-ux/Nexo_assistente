-- ============================================
-- ATIVAR DOCUMENTO MANUALMENTE
-- ============================================
-- 
-- Use este script quando o Redis não estiver disponível
-- e você precisar ativar um documento pendente
--
-- ⚠️ ATENÇÃO: Isto NÃO cria os embeddings/chunks!
-- O documento ficará ativo mas SEM indexação vetorial.
-- O assistente NÃO conseguirá encontrar informações dele.
--
-- SOLUÇÃO TEMPORÁRIA até instalar Redis.
-- ============================================

-- Atualizar status do último documento para ATIVO
UPDATE documents 
SET status = 'ACTIVE', 
    updated_at = NOW()
WHERE id = (
  SELECT id FROM documents 
  WHERE status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1
)
RETURNING id, name, status, created_at, updated_at;

-- ============================================
-- PRÓXIMO PASSO IMPORTANTE:
-- ============================================
--
-- Para o documento funcionar no assistente, você precisa:
--
-- 1. Instalar Redis no Windows:
--    - Baixar: https://github.com/microsoftarchive/redis/releases
--    - Ou usar Docker: docker run -d -p 6379:6379 redis
--    - Ou usar WSL: wsl --install; wsl; sudo apt install redis-server
--
-- 2. Reprocessar o documento após instalar Redis:
--    - Marcar como PENDING novamente
--    - Reiniciar o backend
--    - O processador vai indexar automaticamente
--
-- ============================================
