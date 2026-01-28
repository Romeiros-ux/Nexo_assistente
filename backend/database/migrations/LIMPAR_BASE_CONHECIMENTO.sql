-- ============================================
-- LIMPEZA COMPLETA DA BASE DE CONHECIMENTO
-- ============================================
-- 
-- ⚠️ ATENÇÃO: Este script vai DELETAR TODOS os documentos!
-- 
-- O que este script faz:
-- 1. Cria backup de segurança
-- 2. Limpa chunks vetoriais (embeddings)
-- 3. Limpa documentos
-- 4. Limpa arquivos órfãos do storage (opcional)
-- 5. Reseta estatísticas
--
-- Tempo estimado: ~30 segundos
-- ============================================

-- Passo 1: Verificar quantidade atual
DO $$
DECLARE
  doc_count INT := 0;
  chunk_count INT := 0;
  chunks_exists BOOLEAN;
  document_chunks_exists BOOLEAN;
BEGIN
  -- Verificar qual tabela de chunks existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chunks'
  ) INTO chunks_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'document_chunks'
  ) INTO document_chunks_exists;
  
  SELECT COUNT(*) INTO doc_count FROM documents;
  
  IF chunks_exists THEN
    SELECT COUNT(*) INTO chunk_count FROM chunks;
  ELSIF document_chunks_exists THEN
    SELECT COUNT(*) INTO chunk_count FROM document_chunks;
  END IF;
  
  RAISE NOTICE '📊 SITUAÇÃO ATUAL:';
  RAISE NOTICE '   - Documentos: %', doc_count;
  RAISE NOTICE '   - Chunks: %', chunk_count;
  RAISE NOTICE '   - Tabela chunks existe: %', chunks_exists;
  RAISE NOTICE '   - Tabela document_chunks existe: %', document_chunks_exists;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Preparando para limpar TUDO...';
END $$;

-- Passo 2: Criar tabela de backup (caso precise restaurar depois)
DO $$
BEGIN
  -- Backup de documents
  DROP TABLE IF EXISTS documents_backup_2026_01_16;
  CREATE TABLE documents_backup_2026_01_16 AS SELECT * FROM documents;
  RAISE NOTICE '✅ Backup de documents criado';

  -- Backup de chunks (se existir)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chunks') THEN
    DROP TABLE IF EXISTS chunks_backup_2026_01_16;
    CREATE TABLE chunks_backup_2026_01_16 AS SELECT * FROM chunks;
    RAISE NOTICE '✅ Backup de chunks criado';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    DROP TABLE IF EXISTS document_chunks_backup_2026_01_16;
    CREATE TABLE document_chunks_backup_2026_01_16 AS SELECT * FROM document_chunks;
    RAISE NOTICE '✅ Backup de document_chunks criado';
  ELSE
    RAISE NOTICE '⚠️  Nenhuma tabela de chunks encontrada para backup';
  END IF;
END $$;

-- Passo 3: LIMPAR CHUNKS VETORIAIS
-- (Precisa ser primeiro por causa da foreign key)
DO $$
DECLARE
  deleted_count INT := 0;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chunks') THEN
    DELETE FROM chunks;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️  % chunks deletados', deleted_count;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    DELETE FROM document_chunks;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️  % document_chunks deletados', deleted_count;
  ELSE
    RAISE NOTICE '⚠️  Nenhuma tabela de chunks encontrada';
  END IF;
END $$;

-- Passo 4: LIMPAR DOCUMENTOS
DO $$
DECLARE
  deleted_count INT := 0;
BEGIN
  DELETE FROM documents;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '🗑️  % documentos deletados', deleted_count;
END $$;

-- Passo 5: Resetar sequências (IDs começam do zero novamente)
-- ALTER SEQUENCE documents_id_seq RESTART WITH 1;
-- Nota: Supabase usa UUIDs, não precisa resetar

-- Passo 6: Verificar limpeza
DO $$
DECLARE
  doc_count INT := 0;
  chunk_count INT := 0;
  backup_count INT := 0;
  chunks_table TEXT := '';
BEGIN
  SELECT COUNT(*) INTO doc_count FROM documents;
  SELECT COUNT(*) INTO backup_count FROM documents_backup_2026_01_16;
  
  -- Verificar qual tabela de chunks existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chunks') THEN
    SELECT COUNT(*) INTO chunk_count FROM chunks;
    chunks_table := 'chunks';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    SELECT COUNT(*) INTO chunk_count FROM document_chunks;
    chunks_table := 'document_chunks';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ LIMPEZA CONCLUÍDA!';
  RAISE NOTICE '📊 SITUAÇÃO FINAL:';
  RAISE NOTICE '   - Documentos atuais: %', doc_count;
  RAISE NOTICE '   - Chunks atuais: %', chunk_count;
  RAISE NOTICE '   - Documentos no backup: %', backup_count;
  RAISE NOTICE '';
  
  IF doc_count = 0 AND chunk_count = 0 THEN
    RAISE NOTICE '🎉 Base de conhecimento totalmente limpa!';
    RAISE NOTICE '📝 Pronto para recadastrar documentos organizados.';
  ELSE
    RAISE WARNING '⚠️  Ainda restam % documentos e % chunks', doc_count, chunk_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '💾 BACKUP DISPONÍVEL:';
  RAISE NOTICE '   Para restaurar (SE NECESSÁRIO):';
  RAISE NOTICE '   INSERT INTO documents SELECT * FROM documents_backup_2026_01_16;';
  IF chunks_table != '' THEN
    IF chunks_table = 'chunks' THEN
      RAISE NOTICE '   INSERT INTO chunks SELECT * FROM chunks_backup_2026_01_16;';
    ELSE
      RAISE NOTICE '   INSERT INTO document_chunks SELECT * FROM document_chunks_backup_2026_01_16;';
    END IF;
  END IF;
END $$;

-- ============================================
-- OPCIONAL: Limpar Storage (arquivos físicos)
-- ============================================
-- 
-- ⚠️ CUIDADO: Isso deleta os arquivos FÍSICOS do Supabase Storage!
-- Só execute se tiver certeza!
--
-- Para limpar storage, use o painel do Supabase:
-- 1. Vá para Storage > documents
-- 2. Selecione todos os arquivos
-- 3. Clique em Delete
--
-- Ou via API (não recomendado fazer via SQL):
-- supabase.storage.from('documents').remove([...])
-- ============================================

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================
-- 
-- ✅ 1. Base limpa e pronta!
-- 📝 2. Agora cadastre documentos REAIS usando:
--       - Domínio correto
--       - Subdomínio específico
--       - Tags relevantes
--       - Ano de referência
--       - Descrição detalhada
--
-- 🎯 3. Comece com documentos mais importantes:
--       - Leis principais
--       - Plano Municipal de Educação
--       - Calendário Escolar
--       - Manuais de processos críticos
--
-- 📊 4. Documentos ideais para começar (10-20):
--       - Mix de tipos (PDFs, Excel, URLs)
--       - Diferentes domínios
--       - Representativos do sistema
--
-- ============================================
