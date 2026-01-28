-- SOLUÇÃO: Deletar chunks da Lista De Ceps para reprocessar completamente
-- (Isso vai permitir que o script processe novamente com embeddings)

DELETE FROM document_chunks
WHERE document_version_id IN (
    SELECT dv.id
    FROM document_versions dv
    JOIN documents d ON dv.document_id = d.id
    WHERE d.name = 'Lista De Ceps De Saquarema'
);

-- Verificar resultado
SELECT COUNT(*) as chunks_restantes FROM document_chunks;
SELECT COUNT(*) as embeddings_restantes FROM document_embeddings;

-- Resetar documento para PENDING
UPDATE documents
SET status = 'PENDING'
WHERE name = 'Lista De Ceps De Saquarema';
