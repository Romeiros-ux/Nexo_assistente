-- ================================================
-- Adicionar Coluna de Embedding se não existir
-- ================================================
-- Este script adiciona a coluna 'embedding' do tipo vector(1536)
-- à tabela document_chunks se ela não existir
-- ================================================

-- 1. Verificar se extensão pgvector está instalada
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verificar estrutura atual
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks';

-- 3. Adicionar coluna embedding se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'document_chunks' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE document_chunks 
        ADD COLUMN embedding vector(1536);
        
        RAISE NOTICE 'Coluna embedding adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna embedding já existe!';
    END IF;
END $$;

-- 4. Criar índice para busca de similaridade (opcional, mas recomendado)
-- Usa HNSW (Hierarchical Navigable Small World) para busca eficiente
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Verificar resultado
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks'
ORDER BY ordinal_position;

-- 6. Verificar índices criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks';

-- ================================================
-- Notas:
-- ================================================
-- - vector(1536): dimensão do embedding text-embedding-3-large
-- - hnsw: algoritmo de busca aproximada (melhor performance)
-- - vector_cosine_ops: operador de similaridade de cosseno
-- - m = 16: número de conexões por nó (16 é padrão)
-- - ef_construction = 64: qualidade da construção do índice
-- ================================================
