-- =========================================
-- FIX: ADICIONAR ALIASES NAS COLUNAS
-- =========================================
-- O backend espera: chunk_id, chunk_content, chunk_metadata, document_id, document_name, document_type, similarity
-- O SQL estava retornando apenas: id, content, metadata, id, name, document_type, float

DROP FUNCTION IF EXISTS match_chunks(vector, float, int, text, text, uuid);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.001,
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
LANGUAGE sql STABLE
AS $$
  -- CTE: Usa índice IVFFlat PRIMEIRO para pegar top K embeddings
  WITH top_embeddings AS (
    SELECT 
      de.document_chunk_id,
      de.embedding,
      de.embedding <=> query_embedding AS distance
    FROM document_embeddings de
    WHERE de.model = 'text-embedding-3-large'
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 10  -- Overfetch para compensar filtros depois
  )
  -- Depois faz JOINs apenas nos top K (não nos 30k)
  SELECT 
    dc.id AS chunk_id,
    dc.content AS chunk_content,
    dc.metadata AS chunk_metadata,
    d.id AS document_id,
    d.name AS document_name,
    d.document_type::TEXT AS document_type,
    (1 - te.distance)::float AS similarity
  FROM top_embeddings te
  JOIN document_chunks dc ON dc.id = te.document_chunk_id
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    d.status::TEXT = filter_status
    AND dv.indexed = TRUE
    AND (filter_document_type IS NULL OR d.document_type::TEXT = filter_document_type)
  ORDER BY te.distance
  LIMIT match_count;
$$;

-- Configurar antes de testar
SET ivfflat.probes = 30;

-- Testar com aliases corretos
SELECT chunk_id, chunk_content, document_name, similarity
FROM match_chunks(
  array_fill(0.1, ARRAY[1536])::vector,
  0.001,
  5
);
