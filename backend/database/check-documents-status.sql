-- ====================================
-- VERIFICAR STATUS DOS DOCUMENTOS
-- ====================================

-- 1. Listar todos os documentos e seu status de processamento
SELECT * FROM documents ORDER BY updated_at DESC LIMIT 10;

-- 2. Contar documentos por status
SELECT 
  status,
  COUNT(*) as total
FROM documents
GROUP BY status;

-- 3. Verificar se existem chunks gerados
SELECT COUNT(*) as total_chunks FROM document_chunks;

-- 4. Listar estrutura da tabela document_chunks
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_chunks';
