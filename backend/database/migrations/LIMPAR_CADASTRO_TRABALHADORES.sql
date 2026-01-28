-- Limpar documento "Cadastro de Trabalhadores 2026" que falhou no processamento
-- Execute este SQL no Supabase SQL Editor antes de reenviar o arquivo

-- 1. Buscar ID do documento
SELECT id, name, status, file_url
FROM documents
WHERE name LIKE '%Cadastro de Trabalhadores%';

-- 2. Deletar embeddings
DELETE FROM document_embeddings
WHERE document_chunk_id IN (
  SELECT dc.id
  FROM document_chunks dc
  JOIN document_versions dv ON dc.document_version_id = dv.id
  WHERE dv.document_id IN (
    SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%'
  )
);

-- 3. Deletar chunks
DELETE FROM document_chunks
WHERE document_version_id IN (
  SELECT id FROM document_versions
  WHERE document_id IN (
    SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%'
  )
);

-- 4. Deletar versões
DELETE FROM document_versions
WHERE document_id IN (
  SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%'
);

-- 5. Deletar documento
DELETE FROM documents
WHERE name LIKE '%Cadastro de Trabalhadores%';

-- Verificar limpeza
SELECT 
  (SELECT COUNT(*) FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%') as documentos,
  (SELECT COUNT(*) FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%')) as versoes,
  (SELECT COUNT(*) FROM document_chunks WHERE document_version_id IN (SELECT id FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%'))) as chunks,
  (SELECT COUNT(*) FROM document_embeddings WHERE document_chunk_id IN (SELECT dc.id FROM document_chunks dc JOIN document_versions dv ON dc.document_version_id = dv.id WHERE dv.document_id IN (SELECT id FROM documents WHERE name LIKE '%Cadastro de Trabalhadores%'))) as embeddings;
-- Todos devem retornar 0
