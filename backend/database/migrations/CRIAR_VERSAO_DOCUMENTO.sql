-- =====================================================
-- Criar versão para documento sem versão
-- =====================================================
-- Documento: b9e820ca-8a50-4591-b071-7abfa5a58242
-- Nome: Cadastro de Trabalhadores 2026

-- 1. Criar document_version
INSERT INTO document_versions (
  id,
  document_id,
  version_number,
  status,
  created_at
)
VALUES (
  gen_random_uuid(),
  'b9e820ca-8a50-4591-b071-7abfa5a58242',
  1,
  'PROCESSING',
  NOW()
)
RETURNING id, document_id, version_number, status;

-- 2. Verificar criação
SELECT 
  dv.id as version_id,
  dv.version_number,
  dv.status,
  d.id as document_id,
  d.name as document_name
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE d.id = 'b9e820ca-8a50-4591-b071-7abfa5a58242';
