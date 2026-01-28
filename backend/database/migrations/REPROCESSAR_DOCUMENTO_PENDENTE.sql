-- ============================================
-- REPROCESSAR DOCUMENTO PENDENTE
-- ============================================
-- 
-- Este script:
-- 1. Ativa o documento (muda status para ACTIVE)
-- 2. Retorna o ID do documento
-- 3. Use o ID retornado para chamar a API de reprocessamento
--
-- ============================================

-- Passo 1: Ativar e pegar o ID
DO $$
DECLARE
  doc_id UUID;
  doc_name TEXT;
BEGIN
  -- Ativar o documento pendente mais recente
  UPDATE documents 
  SET status = 'ACTIVE', 
      updated_at = NOW()
  WHERE id = (
    SELECT id FROM documents 
    WHERE status = 'PENDING'
    ORDER BY created_at DESC
    LIMIT 1
  )
  RETURNING id, name INTO doc_id, doc_name;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Documento ativado!';
  RAISE NOTICE '📄 ID: %', doc_id;
  RAISE NOTICE '📝 Nome: %', doc_name;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  PRÓXIMO PASSO:';
  RAISE NOTICE '   Execute este comando no PowerShell/Terminal:';
  RAISE NOTICE '';
  RAISE NOTICE '   curl -X POST http://localhost:3001/api/v1/documents/%/reindex -H "Authorization: Bearer SEU_TOKEN"', doc_id;
  RAISE NOTICE '';
END $$;

-- ============================================
-- INSTRUÇÕES:
-- ============================================
--
-- Após executar este script:
--
-- 1. Copie o ID do documento que apareceu acima
--
-- 2. Abra o PowerShell e execute:
--    
--    $token = "SEU_TOKEN_AQUI"
--    $docId = "ID_DO_DOCUMENTO"
--    curl -X POST "http://localhost:3001/api/v1/documents/$docId/reindex" -H "Authorization: Bearer $token"
--
-- 3. Aguarde ~30-60 segundos para o processamento
--
-- 4. O documento terá embeddings e estará pronto!
--
-- ============================================
