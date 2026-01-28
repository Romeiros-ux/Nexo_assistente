-- Adicionar coluna metadata à tabela documents
-- Esta coluna armazena informações extras como URL de origem, data de crawling, etc.

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN documents.metadata IS 'Dados adicionais: source_url, source_type, crawled_at, etc';

-- Criar índice para buscas em metadata
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING gin(metadata);

-- Verificar se foi aplicado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name = 'metadata';
