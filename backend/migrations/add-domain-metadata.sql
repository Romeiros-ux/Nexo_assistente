-- Migration: Adicionar metadados de domínio aos documentos
-- Data: 2026-01-14
-- Descrição: Sistema de classificação por domínios educacionais

-- 1. Adicionar colunas de domínio à tabela documents
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
  ADD COLUMN IF NOT EXISTS keywords TEXT[],
  ADD COLUMN IF NOT EXISTS metadata_year INTEGER,
  ADD COLUMN IF NOT EXISTS education_stage VARCHAR(50);

-- 2. Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_documents_domain ON documents(domain);
CREATE INDEX IF NOT EXISTS idx_documents_subdomain ON documents(subdomain);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(metadata_year);
CREATE INDEX IF NOT EXISTS idx_documents_stage ON documents(education_stage);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING GIN(keywords);

-- 3. Atualizar documentos existentes com classificação automática

-- INDICADORES EDUCACIONAIS - IDEB
UPDATE documents 
SET 
  domain = 'INDICADORES_EDUCACIONAIS',
  subdomain = 'IDEB',
  keywords = ARRAY['ideb', 'índice de desenvolvimento', 'educação básica', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2023%' THEN 2023
    WHEN name LIKE '%2024%' THEN 2024
    ELSE NULL
  END,
  education_stage = CASE
    WHEN name LIKE '%AF%' OR name LIKE '%anos-finais%' THEN 'AF'
    WHEN name LIKE '%AI%' OR name LIKE '%anos-iniciais%' THEN 'AI'
    WHEN name LIKE '%EM%' OR name LIKE '%ensino-medio%' THEN 'EM'
    ELSE NULL
  END
WHERE name ILIKE '%ideb%'
  AND document_type = 'REPORT';

-- INDICADORES EDUCACIONAIS - Taxa de Rendimento
UPDATE documents 
SET 
  domain = 'INDICADORES_EDUCACIONAIS',
  subdomain = 'TAXA_RENDIMENTO',
  keywords = ARRAY['taxa rendimento', 'aprovação', 'reprovação', 'abandono', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2023%' THEN 2023
    WHEN name LIKE '%2024%' THEN 2024
    ELSE NULL
  END,
  education_stage = CASE
    WHEN name LIKE '%AF%' THEN 'AF'
    WHEN name LIKE '%AI%' THEN 'AI'
    WHEN name LIKE '%EM%' THEN 'EM'
    ELSE NULL
  END
WHERE name ILIKE '%taxa_rendimento%'
  AND document_type = 'REPORT';

-- INDICADORES EDUCACIONAIS - Distorção Idade-Série
UPDATE documents 
SET 
  domain = 'INDICADORES_EDUCACIONAIS',
  subdomain = 'DISTORCAO_IDADE_SERIE',
  keywords = ARRAY['distorção idade-série', 'defasagem', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2023%' THEN 2023
    WHEN name LIKE '%2024%' THEN 2024
    WHEN name LIKE '%2020%' THEN 2020
    ELSE NULL
  END,
  education_stage = CASE
    WHEN name LIKE '%AF%' THEN 'AF'
    WHEN name LIKE '%AI%' THEN 'AI'
    WHEN name LIKE '%EM%' THEN 'EM'
    ELSE NULL
  END
WHERE name ILIKE '%distorcao%idade%serie%'
  AND document_type = 'REPORT';

-- INDICADORES EDUCACIONAIS - SAEB
UPDATE documents 
SET 
  domain = 'INDICADORES_EDUCACIONAIS',
  subdomain = 'SAEB',
  keywords = ARRAY['saeb', 'aprendizado', 'proficiência', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2023%' THEN 2023
    WHEN name LIKE '%2024%' THEN 2024
    ELSE NULL
  END,
  education_stage = CASE
    WHEN name LIKE '%AF%' THEN 'AF'
    WHEN name LIKE '%AI%' THEN 'AI'
    WHEN name LIKE '%EM%' THEN 'EM'
    ELSE NULL
  END
WHERE name ILIKE '%saeb%'
  AND document_type = 'REPORT';

-- INDICADORES EDUCACIONAIS - Permanências
UPDATE documents 
SET 
  domain = 'INDICADORES_EDUCACIONAIS',
  subdomain = 'PERMANENCIA',
  keywords = ARRAY['permanência', 'retenção', 'continuidade', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2020%' THEN 2020
    WHEN name LIKE '%2023%' THEN 2023
    ELSE NULL
  END,
  education_stage = CASE
    WHEN name LIKE '%AF%' THEN 'AF'
    WHEN name LIKE '%AI%' THEN 'AI'
    WHEN name LIKE '%EM%' THEN 'EM'
    ELSE NULL
  END
WHERE name ILIKE '%permanencia%'
  AND document_type = 'REPORT';

-- LEGISLAÇÃO - Leis Orgânicas
UPDATE documents 
SET 
  domain = 'LEGISLACAO',
  subdomain = 'LEIS_ORGANICAS',
  keywords = ARRAY['lei orgânica', 'legislação municipal', 'saquarema'],
  metadata_year = CASE 
    WHEN name ~ 'LO-\d+-(\d{4})' THEN 
      CAST(substring(name from 'LO-\d+-(\d{4})') AS INTEGER)
    ELSE NULL
  END
WHERE (name ILIKE 'LO-%' OR name ILIKE '%lei-organica%')
  AND document_type IN ('LAW', 'NORM');

-- LEGISLAÇÃO - Leis Complementares
UPDATE documents 
SET 
  domain = 'LEGISLACAO',
  subdomain = 'LEIS_COMPLEMENTARES',
  keywords = ARRAY['lei complementar', 'legislação', 'saquarema'],
  metadata_year = CASE 
    WHEN name ~ 'LC-\d+-(\d{4})' THEN 
      CAST(substring(name from 'LC-\d+-(\d{4})') AS INTEGER)
    ELSE NULL
  END
WHERE name ILIKE 'LC-%'
  AND document_type IN ('LAW', 'NORM');

-- LEGISLAÇÃO - Decretos
UPDATE documents 
SET 
  domain = 'LEGISLACAO',
  subdomain = 'DECRETOS',
  keywords = ARRAY['decreto', 'diário oficial', 'saquarema'],
  metadata_year = CASE 
    WHEN name ~ 'D\.O\.S\.-\d+-(\d{2})' THEN 
      2000 + CAST(substring(name from 'D\.O\.S\.-\d+-(\d{2})') AS INTEGER)
    ELSE NULL
  END
WHERE name ILIKE 'D.O.S.%'
  AND document_type IN ('LAW', 'NORM', 'OTHER');

-- LEGISLAÇÃO - Planos Municipais
UPDATE documents 
SET 
  domain = 'LEGISLACAO',
  subdomain = 'PLANOS',
  keywords = ARRAY['plano municipal', 'educação', 'saquarema'],
  metadata_year = CASE 
    WHEN name LIKE '%2015%' THEN 2015
    WHEN name LIKE '%2020%' THEN 2020
    WHEN name LIKE '%2025%' THEN 2025
    ELSE NULL
  END
WHERE (name ILIKE '%plano%municipal%' OR name ILIKE '%PME%' OR name ILIKE '%PPA%')
  AND document_type IN ('LAW', 'NORM', 'MANUAL', 'OTHER');

-- GESTÃO DE RECURSOS - Orçamento
UPDATE documents 
SET 
  domain = 'GESTAO_RECURSOS',
  subdomain = 'ORCAMENTO',
  keywords = ARRAY['orçamento', 'receita', 'despesa', 'saquarema'],
  metadata_year = CASE 
    WHEN name ~ 'LO-\d+-(\d{4})' THEN 
      CAST(substring(name from 'LO-\d+-(\d{4})') AS INTEGER)
    WHEN name ~ '(\d{4})' THEN 
      CAST(substring(name from '(\d{4})') AS INTEGER)
    ELSE NULL
  END
WHERE (name ILIKE '%anexo%' OR name ILIKE '%receita%' OR name ILIKE '%despesa%' OR name ILIKE '%orcament%')
  AND document_type IN ('REPORT', 'OTHER');

-- TRANSPARÊNCIA - Portal
UPDATE documents 
SET 
  domain = 'TRANSPARENCIA',
  subdomain = 'PORTAL_TRANSPARENCIA',
  keywords = ARRAY['transparência', 'dados públicos', 'saquarema'],
  metadata_year = EXTRACT(YEAR FROM uploaded_at)::INTEGER
WHERE (name ILIKE '%transparencia%' OR name ILIKE '%portal%')
  AND document_type = 'OTHER';

-- TRANSPARÊNCIA - QEdu
UPDATE documents 
SET 
  domain = 'TRANSPARENCIA',
  subdomain = 'QEDU',
  keywords = ARRAY['qedu', 'dados educacionais', 'saquarema'],
  metadata_year = EXTRACT(YEAR FROM uploaded_at)::INTEGER
WHERE name ILIKE '%qedu%'
  AND document_type = 'OTHER';

-- 4. Criar função para busca por domínio
CREATE OR REPLACE FUNCTION match_chunks_by_domain(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_domain text DEFAULT NULL,
  filter_subdomain text DEFAULT NULL,
  filter_document_type text DEFAULT NULL,
  filter_year int DEFAULT NULL,
  filter_education_stage text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_chunk_id uuid,
  document_id uuid,
  document_name text,
  document_type text,
  domain text,
  subdomain text,
  content text,
  similarity float,
  metadata_year int,
  education_stage text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id as chunk_id,
    dc.id as document_chunk_id,
    d.id as document_id,
    d.name as document_name,
    d.document_type,
    d.domain,
    d.subdomain,
    dc.content,
    1 - (de.embedding <=> query_embedding) as similarity,
    d.metadata_year,
    d.education_stage
  FROM document_embeddings de
  INNER JOIN document_chunks dc ON de.document_chunk_id = dc.id
  INNER JOIN document_versions dv ON dc.document_version_id = dv.id
  INNER JOIN documents d ON dv.document_id = d.id
  WHERE 
    dv.status = 'COMPLETED'
    AND dv.indexed = true
    AND d.status = 'ACTIVE'
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND (filter_domain IS NULL OR d.domain = filter_domain)
    AND (filter_subdomain IS NULL OR d.subdomain = filter_subdomain)
    AND (filter_document_type IS NULL OR d.document_type = filter_document_type)
    AND (filter_year IS NULL OR d.metadata_year = filter_year)
    AND (filter_education_stage IS NULL OR d.education_stage = filter_education_stage)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Comentários
COMMENT ON COLUMN documents.domain IS 'Domínio principal do conhecimento (ex: INDICADORES_EDUCACIONAIS, LEGISLACAO)';
COMMENT ON COLUMN documents.subdomain IS 'Subdomínio específico (ex: IDEB, TAXA_RENDIMENTO)';
COMMENT ON COLUMN documents.keywords IS 'Palavras-chave para busca e classificação';
COMMENT ON COLUMN documents.metadata_year IS 'Ano dos dados do documento (extraído do nome ou conteúdo)';
COMMENT ON COLUMN documents.education_stage IS 'Etapa educacional: AF (Anos Finais), AI (Anos Iniciais), EM (Ensino Médio)';
