-- Resetar os 3 documentos ACTIVE para reprocessamento
-- (Lista De Ceps já está processada com sucesso)

UPDATE documents
SET status = 'PENDING', updated_at = NOW()
WHERE name IN (
    'Lei Ordinária 2232/2022',
    'Lei Ordinária 2667/2024',
    'Plano Municipal De Educação - Saquarema'
)
AND status = 'ACTIVE';

-- Verificar resultado
SELECT 
    status, 
    name,
    COUNT(*) OVER() as total_pending
FROM documents
WHERE status = 'PENDING'
ORDER BY name;
