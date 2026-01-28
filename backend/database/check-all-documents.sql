-- Ver todos os documentos e seus status
SELECT 
    id,
    status,
    name,
    document_type,
    updated_at
FROM documents
ORDER BY status DESC, name;
