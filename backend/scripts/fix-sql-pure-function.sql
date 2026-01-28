-- =========================================
-- FUNÇÃO SQL PURA - PERMITE OTIMIZAÇÃO INLINE
-- =========================================

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
  content text,
  metadata jsonb,
  document_id uuid,
  document_name text,
  document_type text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  -- SQL pura permite PostgreSQL otimizar melhor que PLPGSQL
  SELECT 
    dc.id,
    dc.content,
    dc.metadata,
    d.id,
    d.name,
    d.document_type::TEXT,
    (1 - (de.embedding <=> query_embedding))::float
  FROM document_embeddings de
  JOIN document_chunks dc ON dc.id = de.document_chunk_id
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE 
    d.status::TEXT = filter_status
    AND dv.indexed = TRUE
    AND de.model = 'text-embedding-3-large'
    AND (filter_document_type IS NULL OR d.document_type::TEXT = filter_document_type)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Configurar probes ANTES de chamar
SET ivfflat.probes = 30;
SET statement_timeout = '60s';

-- Testar: TOP 5 com vetor real
EXPLAIN ANALYZE
SELECT * FROM match_chunks(
  array_fill(0.1, ARRAY[1536])::vector,
  0.001,
  5
);
