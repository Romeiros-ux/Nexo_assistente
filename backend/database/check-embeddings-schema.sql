-- Verificar schema da tabela document_embeddings
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_embeddings' 
ORDER BY ordinal_position;
