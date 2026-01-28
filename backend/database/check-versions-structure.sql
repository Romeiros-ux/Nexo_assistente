-- Verificar estrutura da tabela document_versions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_versions'
ORDER BY ordinal_position;
