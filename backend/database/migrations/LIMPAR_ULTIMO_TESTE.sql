-- =====================================================
-- LIMPAR ÚLTIMO TESTE
-- =====================================================
-- Document ID: 5634f71a-33fe-4173-bc4b-842ac2609168
-- Version ID: 584a8ae0-bd1a-4612-a69b-b0a05c0e0882

-- 1. Deletar chunks (se existirem)
DELETE FROM document_chunks 
WHERE document_version_id = '584a8ae0-bd1a-4612-a69b-b0a05c0e0882';

-- 2. Deletar versões
DELETE FROM document_versions 
WHERE id = '584a8ae0-bd1a-4612-a69b-b0a05c0e0882';

-- 3. Deletar jobs de indexação
DELETE FROM document_indexing_jobs
WHERE document_id = '5634f71a-33fe-4173-bc4b-842ac2609168';

-- 4. Deletar documento
DELETE FROM documents 
WHERE id = '5634f71a-33fe-4173-bc4b-842ac2609168';

-- 5. Verificar limpeza
SELECT 'Documentos:' as tabela, COUNT(*) as registros FROM documents
UNION ALL
SELECT 'Versões:', COUNT(*) FROM document_versions
UNION ALL
SELECT 'Chunks:', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'Jobs:', COUNT(*) FROM document_indexing_jobs;
