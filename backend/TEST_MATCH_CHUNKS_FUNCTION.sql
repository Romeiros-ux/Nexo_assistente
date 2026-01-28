-- TESTE DIRETO DA FUNÇÃO match_chunks_by_domain
-- Executar no Supabase SQL Editor

-- 1. Verificar se a função existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'match_chunks_by_domain';

-- 2. Verificar documento
SELECT id, name, domain, subdomain, status, document_type
FROM documents 
WHERE name = 'Cadastro de Trabalhadores 2026';

-- 3. Contar embeddings totais
SELECT COUNT(*) as total_embeddings
FROM document_embeddings;

-- 4. Testar a função com embedding fake (vetor de zeros)
-- IMPORTANTE: Substituir o vetor abaixo por um real se necessário
SELECT 
  chunk_id,
  document_name,
  domain,
  subdomain,
  similarity
FROM match_chunks_by_domain(
  query_embedding := ARRAY_FILL(0.001::float, ARRAY[1536])::vector(1536),
  match_threshold := 0.0,
  match_count := 10,
  filter_domain := 'RECURSOS_HUMANOS',
  filter_subdomain := 'SERVIDORES',
  filter_document_type := NULL,
  filter_year := NULL,
  filter_education_stage := NULL
)
LIMIT 10;

-- 5. Verificar se há embeddings para documentos com RECURSOS_HUMANOS
SELECT COUNT(*) as count_rh_embeddings
FROM document_embeddings de
JOIN document_chunks dc ON de.document_chunk_id = dc.id
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.domain = 'RECURSOS_HUMANOS'
  AND d.status = 'ACTIVE';

-- 6. Testar query manual simplificada (igual à função)
SELECT 
  de.id AS chunk_id,
  d.name AS document_name,
  d.domain,
  d.subdomain,
  d.status
FROM document_embeddings de
JOIN document_chunks dc ON de.document_chunk_id = dc.id
JOIN document_versions dv ON dc.document_version_id = dv.id
JOIN documents d ON dv.document_id = d.id
WHERE d.domain = 'RECURSOS_HUMANOS'
  AND d.subdomain = 'SERVIDORES'
  AND d.status = 'ACTIVE'
LIMIT 10;
