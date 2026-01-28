-- ================================================
-- Verificar Estrutura da Tabela document_chunks
-- ================================================

-- 1. Verificar se a tabela existe e suas colunas
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'document_chunks'
ORDER BY ordinal_position;

-- 2. Verificar extensão pgvector instalada
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. Verificar tipos de dados customizados (vector)
SELECT 
    typname,
    typlen,
    typtype
FROM pg_type
WHERE typname LIKE '%vector%';

-- 4. Ver definição completa da tabela
SELECT 
    table_name,
    column_name,
    udt_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'document_chunks'
  AND table_schema = 'public';

-- 5. Verificar índices (especialmente para vector)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks'
  AND schemaname = 'public';
