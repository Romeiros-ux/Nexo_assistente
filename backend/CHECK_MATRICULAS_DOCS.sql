-- Verificar documentos relacionados a matrículas/censo escolar
SELECT 
  COUNT(*) as total,
  subdomain,
  document_type,
  metadata_year
FROM documents
WHERE domain = 'INDICADORES_EDUCACIONAIS'
  AND (
    subdomain = 'MATRICULAS' 
    OR name ILIKE '%matricula%'
    OR name ILIKE '%censo%'
  )
GROUP BY subdomain, document_type, metadata_year
ORDER BY metadata_year DESC, subdomain;

-- Ver todos os subdomínios de INDICADORES_EDUCACIONAIS
SELECT DISTINCT subdomain, COUNT(*) as total
FROM documents
WHERE domain = 'INDICADORES_EDUCACIONAIS'
GROUP BY subdomain
ORDER BY subdomain;
