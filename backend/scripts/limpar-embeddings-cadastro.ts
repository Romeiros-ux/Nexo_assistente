import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function limparEmbeddings() {
  console.log('🧹 Limpando embeddings do Cadastro de Trabalhadores...\n');

  try {
    // 1. Buscar o documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    if (docError || !doc) {
      throw new Error(`Documento não encontrado: ${docError?.message}`);
    }

    console.log(`📄 Documento: ${doc.name}`);
    console.log(`🆔 ID: ${doc.id}\n`);

    // 2. Buscar a versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .single();

    if (versionError || !version) {
      throw new Error(`Versão não encontrada: ${versionError?.message}`);
    }

    console.log(`📋 Versão: ${version.id}\n`);

    // 3. Buscar IDs dos chunks (TODOS - com paginação)
    console.log('🔍 Carregando chunks...');
    let allChunks: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id)
        .range(from, from + pageSize - 1);

      if (chunksError) {
        throw new Error(`Erro ao buscar chunks: ${chunksError.message}`);
      }

      if (!chunks || chunks.length === 0) {
        hasMore = false;
        break;
      }

      allChunks = allChunks.concat(chunks);
      from += pageSize;
      hasMore = chunks.length === pageSize;

      console.log(`   ${allChunks.length} chunks carregados...`);
    }

    const chunkIds = allChunks.map((c) => c.id);
    console.log(`📊 Total de chunks: ${chunkIds.length}\n`);

    if (chunkIds.length === 0) {
      console.log('✅ Nenhum chunk encontrado!\n');
      return;
    }

    // 4. Deletar embeddings diretamente (em lotes)
    console.log('🗑️  Deletando embeddings...');

    const batchSize = 1000;
    let totalDeleted = 0;

    for (let i = 0; i < chunkIds.length; i += batchSize) {
      const batch = chunkIds.slice(i, i + batchSize);

      const { count, error: deleteError } = await supabase
        .from('document_embeddings')
        .delete({ count: 'exact' })
        .in('document_chunk_id', batch);

      if (deleteError) {
        throw new Error(`Erro ao deletar batch ${Math.floor(i / batchSize) + 1}: ${deleteError.message}`);
      }

      totalDeleted += count || 0;
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${count || 0} embeddings deletados (total: ${totalDeleted})`);
    }

    console.log(`\n✅ Todos os embeddings foram deletados com sucesso!`);
    console.log(`🎯 Total deletado: ${totalDeleted}\n`);

  } catch (error) {
    console.error(`\n❌ ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

limparEmbeddings()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
