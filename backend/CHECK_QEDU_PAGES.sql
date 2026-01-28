-- Verificar páginas QEdu indexadas
SELECT 
  name,
  subdomain,
  file_url,
  metadata_year,
  status,
  created_at
FROM documents
WHERE name LIKE '%qedu%'
ORDER BY created_at DESC;

-- Ver chunks das páginas QEdu
SELECT 
  d.name,
  d.subdomain,
  COUNT(dc.id) as total_chunks,
  SUM(LENGTH(dc.content)) as total_chars
FROM documents d
JOIN document_versions dv ON d.id = dv.document_id
JOIN document_chunks dc ON dv.id = dc.document_version_id
WHERE d.name LIKE '%qedu%'
GROUP BY d.name, d.subdomain
ORDER BY d.name;
