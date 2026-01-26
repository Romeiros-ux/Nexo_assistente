-- Drop existing function and recreate without pg_trgm dependency
DROP FUNCTION IF EXISTS public.find_similar_documents(text, text, text, uuid);

CREATE FUNCTION public.find_similar_documents(
  _title TEXT,
  _type TEXT,
  _thematic_area TEXT,
  _unit_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  version TEXT,
  status document_status,
  published_at DATE,
  effective_date DATE,
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.version,
    d.status,
    d.published_at,
    d.effective_date,
    d.created_at,
    -- Simple matching score based on exact matches
    (
      CASE WHEN lower(d.title) = lower(_title) THEN 0.5 ELSE 0.0 END +
      CASE WHEN d.type = _type THEN 0.2 ELSE 0.0 END +
      CASE WHEN d.thematic_area IS NOT NULL AND lower(d.thematic_area) = lower(_thematic_area) THEN 0.2 ELSE 0.0 END +
      CASE WHEN d.unit_id = _unit_id OR (d.unit_id IS NULL AND _unit_id IS NULL) THEN 0.1 ELSE 0.0 END
    )::NUMERIC AS similarity
  FROM documents d
  WHERE d.type = _type
    AND (
      lower(d.title) = lower(_title)
      OR (d.thematic_area IS NOT NULL AND _thematic_area IS NOT NULL AND lower(d.thematic_area) = lower(_thematic_area))
    )
  ORDER BY similarity DESC, d.created_at DESC
  LIMIT 10;
END;
$$;