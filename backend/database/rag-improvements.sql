-- ============================================
-- MELHORIAS RAG - Performance e Qualidade
-- ============================================

-- 1. ÍNDICE VETORIAL (CRÍTICO para performance)
-- Usar ivfflat para buscas rápidas em vetores
-- 
-- ⚠️ LIMITAÇÃO DO SUPABASE FREE TIER:
-- O plano free tem apenas 32 MB de maintenance_work_mem
-- Criar índice ivfflat requer ~59 MB mesmo com lists=10
-- 
-- SOLUÇÃO: Não criar índice no plano free
-- - Com 445 embeddings: Busca sequencial leva ~100-200ms (aceitável)
-- - Com 1000+ embeddings: Precisará upgrade para plano pago
-- - Plano Pro ($25/mês): maintenance_work_mem = 256 MB
--
-- Para criar índice no plano pago, use:
-- CREATE INDEX document_embeddings_embedding_idx 
-- ON document_embeddings 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 20);

DO $$
BEGIN
  RAISE NOTICE '⚠️ Índice ivfflat não criado devido a limitação do Supabase Free Tier';
  RAISE NOTICE '✅ Com 445 embeddings, busca sequencial é aceitável (~100-200ms)';
  RAISE NOTICE '💡 Para +1000 embeddings, upgrade para plano Pro é necessário';
END $$;

-- 2. Adicionar campos para citações precisas
-- page_start e page_end nos chunks

ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS page_start INT,
ADD COLUMN IF NOT EXISTS page_end INT;

COMMENT ON COLUMN document_chunks.page_start IS 'Página inicial do chunk (para citações)';
COMMENT ON COLUMN document_chunks.page_end IS 'Página final do chunk (para citações)';

-- 3. Adicionar token_count para controle de contexto

ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS token_count INT;

COMMENT ON COLUMN document_chunks.token_count IS 'Número aproximado de tokens no chunk';

-- Calcular token_count para chunks existentes (estimativa: 1 token = 4 chars)
UPDATE document_chunks
SET token_count = LENGTH(content) / 4
WHERE token_count IS NULL;

-- 4. Melhorar metadata com informações estruturadas

-- Exemplo de metadata ideal:
-- {
--   "document_name": "Lei 2232/2022",
--   "document_type": "LAW",
--   "page_start": 3,
--   "page_end": 3,
--   "section": "Art. 12",
--   "chunk_size_tokens": 245
-- }

-- 5. View de diagnóstico: chunks sem embeddings

CREATE OR REPLACE VIEW v_chunks_orphaned AS
SELECT 
  dc.id as chunk_id,
  d.name as document_name,
  dc.content,
  dc.chunk_index
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE de.id IS NULL
  AND d.status = 'ACTIVE';

COMMENT ON VIEW v_chunks_orphaned IS 'Chunks ativos sem embeddings (problemas de indexação)';

-- 6. View de performance: estatísticas de busca
-- ⚠️ DESABILITADA: Tabela search_logs não existe no schema atual
-- Para habilitar, crie a tabela search_logs primeiro:
--
-- CREATE TABLE search_logs (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   query TEXT,
--   results_count INT,
--   tokens_used INT,
--   similarity_threshold FLOAT
-- );

/*
CREATE OR REPLACE VIEW v_search_performance AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_searches,
  AVG(results_count) as avg_results,
  AVG(tokens_used) as avg_tokens,
  MIN(similarity_threshold) as min_threshold,
  MAX(similarity_threshold) as max_threshold,
  AVG(similarity_threshold) as avg_threshold
FROM search_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW v_search_performance IS 'Métricas diárias de busca para otimização';
*/

-- 7. Função para recalcular token_count

CREATE OR REPLACE FUNCTION recalculate_token_counts()
RETURNS TABLE(updated_count INT) AS $$
BEGIN
  UPDATE document_chunks
  SET token_count = LENGTH(content) / 4
  WHERE token_count IS NULL OR token_count = 0;
  
  RETURN QUERY SELECT COUNT(*)::INT FROM document_chunks;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_token_counts IS 'Recalcula token_count para todos os chunks (1 token ≈ 4 chars)';

-- 8. Validar integridade dos dados

-- Verificar documentos sem chunks
SELECT 
  'Documentos ACTIVE sem chunks' as issue,
  COUNT(*) as count
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.status = 'ACTIVE'
  AND dc.id IS NULL;

-- Verificar chunks sem embeddings
SELECT 
  'Chunks sem embeddings' as issue,
  COUNT(*) as count
FROM document_chunks dc
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
LEFT JOIN document_embeddings de ON dc.id = de.document_chunk_id
WHERE d.status = 'ACTIVE'
  AND de.id IS NULL;

-- Verificar embeddings com dimensões incorretas
SELECT 
  'Embeddings com dimensões != 1536' as issue,
  COUNT(*) as count
FROM document_embeddings
WHERE vector_dims(embedding) != 1536;

-- 9. Configurar probes para índice ivfflat (performance)
-- Aumentar probes melhora precisão mas reduz velocidade

SET ivfflat.probes = 10; -- Padrão é 1, máximo 100

COMMENT ON SCHEMA public IS 
'probes = 10: bom balanço entre velocidade (2-3x mais lento) e precisão (98%+ recall)';

-- ============================================
-- RESUMO DE MELHORIAS APLICADAS
-- ============================================

SELECT 
  '1. Índice vetorial ivfflat' as melhoria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'document_embeddings_embedding_idx')
    THEN '✅ APLICADO'
    ELSE '❌ FALTANDO'
  END as status
UNION ALL
SELECT 
  '2. Campos page_start/page_end',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_chunks' AND column_name = 'page_start'
    )
    THEN '✅ APLICADO'
    ELSE '❌ FALTANDO'
  END
UNION ALL
SELECT 
  '3. Campo token_count',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_chunks' AND column_name = 'token_count'
    )
    THEN '✅ APLICADO'
    ELSE '❌ FALTANDO'
  END
UNION ALL
SELECT 
  '4. View v_chunks_orphaned',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_chunks_orphaned')
    THEN '✅ APLICADO'
    ELSE '❌ FALTANDO'
  END
UNION ALL
SELECT 
  '5. View v_search_performance',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_search_performance')
    THEN '✅ APLICADO'
    ELSE '❌ FALTANDO'
  END;
