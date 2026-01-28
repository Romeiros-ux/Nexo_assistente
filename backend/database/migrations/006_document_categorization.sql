-- ==========================================
-- MIGRATION: Adicionar campos de estruturação de documentos
-- ==========================================
-- Data: Janeiro 2026
-- Descrição: Adiciona campos para melhor estruturação da base de conhecimento
--            permitindo categorização por domínio, subdomínio, ano, unidade, etc.
-- ==========================================

-- Adicionar novos campos na tabela documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata_year INTEGER,
ADD COLUMN IF NOT EXISTS unit_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS document_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS approved_date DATE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.documents.domain IS 'Domínio do documento (ex: REGULAMENTAÇÃO, PEDAGÓGICO, INDICADORES_EDUCACIONAIS)';
COMMENT ON COLUMN public.documents.subdomain IS 'Subdomínio específico dentro do domínio (ex: REGIMENTO_INTERNO, PPP, IDEB)';
COMMENT ON COLUMN public.documents.metadata_year IS 'Ano de referência do documento';
COMMENT ON COLUMN public.documents.unit_name IS 'Nome da unidade escolar (deixe vazio se o documento for geral/válido para todas)';
COMMENT ON COLUMN public.documents.unit_id IS 'ID da unidade escolar (referência futura para educational_units)';
COMMENT ON COLUMN public.documents.document_version IS 'Versão do documento (ex: 1.0, 2.1, 3.0-beta)';
COMMENT ON COLUMN public.documents.approved_date IS 'Data de aprovação oficial do documento';

-- Criar índices para melhor performance de busca
CREATE INDEX IF NOT EXISTS idx_documents_domain 
  ON public.documents(domain) 
  WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_subdomain 
  ON public.documents(subdomain) 
  WHERE subdomain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_metadata_year 
  ON public.documents(metadata_year) 
  WHERE metadata_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_unit_id 
  ON public.documents(unit_id) 
  WHERE unit_id IS NOT NULL;

-- Índice composto para buscas por domínio + subdomínio
CREATE INDEX IF NOT EXISTS idx_documents_domain_subdomain 
  ON public.documents(domain, subdomain) 
  WHERE domain IS NOT NULL AND subdomain IS NOT NULL;

-- Índice composto para buscas por ano + domínio (comum em consultas de indicadores)
CREATE INDEX IF NOT EXISTS idx_documents_year_domain 
  ON public.documents(metadata_year, domain) 
  WHERE metadata_year IS NOT NULL AND domain IS NOT NULL;

-- ==========================================
-- VALIDAÇÕES E CONSTRAINTS OPCIONAIS
-- ==========================================

-- Primeiro, limpar valores inválidos existentes (se houver)
UPDATE public.documents 
SET metadata_year = NULL 
WHERE metadata_year IS NOT NULL 
  AND (metadata_year < 1900 OR metadata_year > 2100);

-- Garantir que metadata_year seja razoável (entre 1900 e 2100)
ALTER TABLE public.documents
ADD CONSTRAINT check_metadata_year_range 
CHECK (metadata_year IS NULL OR (metadata_year BETWEEN 1900 AND 2100));

-- Garantir que document_version siga padrão básico (opcional)
-- Exemplos válidos: "1.0", "2.1", "3.0-beta", "1.0.0"
ALTER TABLE public.documents
ADD CONSTRAINT check_document_version_format 
CHECK (document_version IS NULL OR document_version ~ '^[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9]+)?$');

-- ==========================================
-- EXEMPLOS DE USO
-- ==========================================

-- Exemplo 1: Documento de regimento interno
-- UPDATE documents SET 
--   domain = 'REGULAMENTAÇÃO',
--   subdomain = 'REGIMENTO_INTERNO',
--   metadata_year = 2026,
--   unit_name = 'Escola Municipal Centro',
--   document_version = '1.0',
--   approved_date = '2026-01-15'
-- WHERE id = 'uuid-do-documento';

-- Exemplo 2: Documento de IDEB (geral, todas as escolas)
-- UPDATE documents SET 
--   domain = 'INDICADORES_EDUCACIONAIS',
--   subdomain = 'IDEB',
--   metadata_year = 2023,
--   unit_name = NULL,  -- Geral
--   document_version = '1.0'
-- WHERE id = 'uuid-do-documento';

-- Exemplo 3: PPP específico de uma escola
-- UPDATE documents SET 
--   domain = 'PEDAGÓGICO',
--   subdomain = 'PPP',
--   metadata_year = 2026,
--   unit_name = 'Escola Municipal Jardim',
--   document_version = '2.0',
--   approved_date = '2025-12-20'
-- WHERE id = 'uuid-do-documento';

-- ==========================================
-- CONSULTAS ÚTEIS
-- ==========================================

-- Ver todos os documentos por domínio
-- SELECT domain, COUNT(*) as total, array_agg(DISTINCT subdomain) as subdomains
-- FROM documents
-- WHERE domain IS NOT NULL
-- GROUP BY domain
-- ORDER BY total DESC;

-- Ver documentos de um ano específico
-- SELECT name, domain, subdomain, metadata_year
-- FROM documents
-- WHERE metadata_year = 2026
-- ORDER BY domain, subdomain;

-- Ver documentos de uma unidade específica
-- SELECT name, domain, subdomain, document_version
-- FROM documents
-- WHERE unit_name = 'Escola Municipal Centro'
-- ORDER BY approved_date DESC;

COMMIT;
