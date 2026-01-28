-- Verificar schema da tabela document_versions
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_versions' 
ORDER BY ordinal_position;
