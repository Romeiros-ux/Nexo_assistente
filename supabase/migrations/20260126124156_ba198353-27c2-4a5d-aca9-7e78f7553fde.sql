-- Função para buscar trechos relevantes dentro de documentos grandes (sem retornar extracted_text inteiro)
CREATE OR REPLACE FUNCTION public.search_document_snippets(
  _needle TEXT,
  _limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  snippet TEXT,
  match_pos INT
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    d.id,
    d.title,
    substring(
      d.extracted_text
      from greatest(strpos(lower(d.extracted_text), lower(_needle)) - 400, 1)
      for 2400
    ) as snippet,
    strpos(lower(d.extracted_text), lower(_needle)) as match_pos
  FROM public.documents d
  WHERE d.status = 'vigente'::public.document_status
    AND d.extracted_text IS NOT NULL
    AND length(trim(_needle)) > 0
    AND strpos(lower(d.extracted_text), lower(_needle)) > 0
    AND public.can_access_document(auth.uid(), d.unit_id, d.min_role)
  ORDER BY match_pos ASC
  LIMIT greatest(coalesce(_limit, 5), 1);
$$;