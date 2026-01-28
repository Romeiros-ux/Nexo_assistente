-- ================================================
-- Resetar Status dos Documentos para Reprocessar
-- ================================================
-- Este script volta os documentos para PENDING
-- para que possam ser reprocessados pelo script corrigido
-- ================================================

-- 1. Verificar documentos ACTIVE sem chunks
SELECT 
    d.name,
    d.status,
    COUNT(dc.id) as chunks_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_version_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id, d.name, d.status
HAVING COUNT(dc.id) = 0;

-- 2. Resetar status para PENDING (4 documentos)
UPDATE documents
SET 
    status = 'PENDING',
    updated_at = NOW()
WHERE name IN (
    'Lei Ordinária 2232/2022',
    'Lei Ordinária 2667/2024',
    'Lista De Ceps De Saquarema',
    'Plano Municipal De Educação - Saquarema'
)
AND status = 'ACTIVE';

-- 3. Confirmar resultado
SELECT 
    status,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as documents
FROM documents
GROUP BY status;

-- ================================================
-- Próximo passo: Executar o script corrigido
-- npx tsx backend/scripts/force-process-documents.ts
-- ================================================
