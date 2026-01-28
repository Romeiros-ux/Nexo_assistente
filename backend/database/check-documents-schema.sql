-- Verificar schema completo da tabela documents
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;

-- Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'documents';
