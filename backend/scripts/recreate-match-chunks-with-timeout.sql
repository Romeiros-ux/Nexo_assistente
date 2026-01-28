-- =========================================
-- RECRIAR match_chunks COM TIMEOUT INTERNO
-- =========================================

-- Remover função antiga
DROP FUNCTION IF EXISTS match_chunks(vector(1536), float, int, text, text, uuid);

-- Criar função com timeout interno de 30s
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 8,
  filter_status text DEFAULT 'ACTIVE',
  filter_document_type text DEFAULT NULL,
  filter_unit_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  chunk_content text,
  chunk_metadata jsonb,
  document_id uuid,
  document_name text,
  document_type text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Aumentar timeout apenas para esta função
  PERFORM set_config('statement_timeout', '30s', true);
  
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.content AS chunk_content,
    dc.metadata AS chunk_metadata,
    d.id AS document_id,
    d.name AS document_name,
    d.document_type::TEXT AS document_type,
    (1 - (de.embedding <=> query_embedding))::float AS similarity
  FROM document_embeddings de
  JOIN document_chunks dc ON dc.id = de.document_chunk_id
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    d.status::TEXT = filter_status
    AND dv.indexed = TRUE
    AND de.model = 'text-embedding-3-large'
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND (filter_document_type IS NULL OR d.document_type::TEXT = filter_document_type)
  ORDER BY de.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Verificar que foi criada
SELECT proname FROM pg_proc WHERE proname = 'match_chunks';
