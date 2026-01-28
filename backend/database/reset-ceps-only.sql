-- Resetar apenas Lista De Ceps para reprocessar
UPDATE documents
SET status = 'PENDING', updated_at = NOW()
WHERE name = 'Lista De Ceps De Saquarema'
AND status = 'ACTIVE';

-- Verificar
SELECT status, name FROM documents WHERE name = 'Lista De Ceps De Saquarema';
