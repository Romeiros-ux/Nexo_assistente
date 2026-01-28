-- =========================================
-- VERIFICAR E OTIMIZAR FUNÇÃO match_chunks
-- =========================================

-- 1. Ver a definição atual da função
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'match_chunks';

-- Se a função não existir ou estiver mal implementada, 
-- execute o bloco abaixo para recriá-la otimizada:

-- =========================================
-- RECRIAR FUNÇÃO match_chunks OTIMIZADA
-- =========================================

-- Remover função antiga
DROP FUNCTION IF EXISTS match_chunks(vector(1536), float, int, text, text, uuid);

-- Criar função otimizada com índice IVFFlat
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_status text DEFAULT 'ACTIVE',
  filter_document_type text DEFAULT NULL,
  filter_unit_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  chunk_content text,
  chunk_metadata jsonb,
  similarity float,
  document_id uuid,
  document_name text,
  document_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.content as chunk_content,
    dc.metadata as chunk_metadata,
    (1 - (de.embedding <=> query_embedding)) as similarity,
    d.id as document_id,
    d.name as document_name,
    d.document_type as document_type
  FROM document_embeddings de
  JOIN document_chunks dc ON dc.id = de.document_chunk_id
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    -- Filtro de status (obrigatório)
    d.status = filter_status
    -- Filtro de similaridade (usa índice IVFFlat)
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    -- Filtro de tipo de documento (opcional)
    AND (filter_document_type IS NULL OR d.document_type = filter_document_type)
    -- Filtro de unidade (opcional, para governança)
    AND (filter_unit_id IS NULL OR d.unit_id = filter_unit_id)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Verificar que a função foi criada
SELECT 
    proname as function_name,
    prokind as kind,
    prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'match_chunks';

-- RESULTADO ESPERADO:
-- function_name: match_chunks
-- kind: f (function)
-- return_type: record
