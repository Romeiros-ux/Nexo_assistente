-- SIMULAÇÃO DE BUSCA: "Qual o IDEB dos anos iniciais de 2023?"
-- Buscar apenas em documentos WEB (type = 'OTHER' e name LIKE '%qedu%')

-- 1. Ver quais documentos web temos sobre IDEB
SELECT 
  d.name,
  d.subdomain,
  d.file_url,
  COUNT(dc.id) as chunks
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.document_type = 'OTHER'
  AND d.name LIKE '%qedu%'
  AND (d.subdomain = 'IDEB' OR d.subdomain = 'VISAO_GERAL')
GROUP BY d.name, d.subdomain, d.file_url;

-- 2. Ver conteúdo dos chunks sobre IDEB (procurar "anos iniciais" ou "AI")
SELECT 
  d.name,
  d.subdomain,
  dc.chunk_index,
  LEFT(dc.content, 1000) as conteudo_preview
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.document_type = 'OTHER'
  AND d.name LIKE '%qedu%'
  AND (
    dc.content ILIKE '%anos iniciais%'
    OR dc.content ILIKE '%AI%'
    OR dc.content ILIKE '%1º ao 5º%'
    OR dc.content ILIKE '%ideb%'
  )
ORDER BY d.name, dc.chunk_index
LIMIT 10;
