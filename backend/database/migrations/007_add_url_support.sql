-- Migration 007: Add URL support to documents table
-- Permite cadastrar links de sites ao invés de apenas arquivos

-- Adicionar colunas para suporte a URLs
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS is_url BOOLEAN DEFAULT false;

-- Adicionar comentários
COMMENT ON COLUMN documents.source_url IS 'URL do site quando documento é um link externo';
COMMENT ON COLUMN documents.is_url IS 'Indica se o documento é uma URL (true) ou arquivo (false)';

-- Criar índice para facilitar busca por documentos tipo URL
CREATE INDEX IF NOT EXISTS idx_documents_is_url ON documents(is_url) WHERE is_url = true;

-- Atualizar constraint: file_url pode ser NULL agora para URLs (será preenchido com source_url)
-- Mas ainda é obrigatório para arquivos
ALTER TABLE documents 
ALTER COLUMN file_url DROP NOT NULL;

-- Adicionar check constraint: deve ter source_url OU file_url válido
ALTER TABLE documents
ADD CONSTRAINT documents_source_check 
CHECK (
  (is_url = true AND source_url IS NOT NULL) OR
  (is_url = false AND file_url IS NOT NULL) OR
  (is_url IS NULL AND file_url IS NOT NULL)
);

-- Log da execução
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007 executada com sucesso!';
  RAISE NOTICE '   - Adicionadas colunas: source_url, is_url';
  RAISE NOTICE '   - Criado índice idx_documents_is_url';
  RAISE NOTICE '   - Adicionado constraint para validação';
END $$;
