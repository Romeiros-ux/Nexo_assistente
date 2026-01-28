-- =====================================================
-- LIMPAR DOCUMENTO ATUAL (NOVO TESTE)
-- =====================================================
-- Document ID: 5a6aea12-91cf-42ee-966c-5992477cc070
-- Version ID: 7efe7f61-9101-4954-b507-2a8bd28c3238

DELETE FROM document_embeddings WHERE document_chunk_id IN (SELECT id FROM document_chunks WHERE document_version_id = '7efe7f61-9101-4954-b507-2a8bd28c3238');
DELETE FROM document_chunks WHERE document_version_id = '7efe7f61-9101-4954-b507-2a8bd28c3238';
DELETE FROM document_versions WHERE id = '7efe7f61-9101-4954-b507-2a8bd28c3238';
DELETE FROM document_indexing_jobs WHERE document_id = '5a6aea12-91cf-42ee-966c-5992477cc070';
DELETE FROM documents WHERE id = '5a6aea12-91cf-42ee-966c-5992477cc070';

SELECT 'Documento limpo' as status;
