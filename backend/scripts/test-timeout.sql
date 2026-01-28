-- =========================================
-- AUMENTAR STATEMENT TIMEOUT
-- =========================================

-- Aumentar timeout para 60 segundos (tempo suficiente para IVFFlat)
-- Isso afeta apenas a sessão atual, não o banco todo
SET statement_timeout = '60s';

-- Verificar o timeout atual
SHOW statement_timeout;

-- Testar a função match_chunks diretamente
SELECT 
    chunk_id,
    document_name,
    document_type,
    similarity,
    substring(chunk_content, 1, 100) as preview
FROM match_chunks(
    array_fill(0.1, ARRAY[1536])::vector,  -- embedding fake para teste
    0.5,  -- threshold
    5,    -- limit
    'ACTIVE',  -- status
    NULL,  -- document_type
    NULL   -- unit_id
)
LIMIT 5;

-- Se este teste funcionar (< 60s), o problema é só o timeout!
-- Nesse caso, precisamos aumentar permanentemente
