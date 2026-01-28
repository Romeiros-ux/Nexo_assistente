-- =========================================
-- OTIMIZAR match_chunks PARA IVFFLAT
-- =========================================
-- Aumenta probes para melhor precisão/velocidade com threshold baixo

DROP FUNCTION IF EXISTS match_chunks(vector, float, int, text, text, uuid);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.030,  -- Ajustado para 3.0% (range real: 3.2-4.7%)
  match_count int DEFAULT 8,
  filter_status text DEFAULT 'ACTIVE',
  filter_document_type text DEFAULT NULL,
  filter_unit_id uuid DEFAULT NULL  -- Mantido por compatibilidade, mas não usado ainda
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Configurações para IVFFlat otimizado
  PERFORM set_config('statement_timeout', '30s', true);
  PERFORM set_config('ivfflat.probes', '20', true);  -- Aumentado de 10 para 20 probes
  
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.metadata,
    d.id,
    d.name,
    d.document_type::TEXT,
    (1 - (de.embedding <=> query_embedding))::float as similarity_score
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
    -- TODO: Adicionar filtro por unit_id quando coluna for implementada
    -- AND (filter_unit_id IS NULL OR d.unit_id = filter_unit_id)
  ORDER BY de.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Testar função otimizada
SELECT 
  chunk_id,
  document_name,
  LEFT(content, 100) as preview,
  similarity
FROM match_chunks(
  array_fill(0.1, ARRAY[1536])::vector,
  0.030,  -- threshold 3.0% (dentro do range real 3.2-4.7%)
  5       -- top 5
);

-- Verificar que probes foram aplicados
SHOW ivfflat.probes;
