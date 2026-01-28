import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente faltando');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function contarEmbeddings() {
  console.log('🔢 Contando embeddings do Cadastro de Trabalhadores...\n');

  try {
    // 1. Buscar documento e versão
    const { data: doc } = await supabase
      .from('documents')
      .select('id, name, status')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    if (!doc) {
      throw new Error('Documento não encontrado');
    }

    console.log(`📄 Documento: ${doc.name}`);
    console.log(`📊 Status: ${doc.status}\n`);

    const { data: version } = await supabase
      .from('document_versions')
      .select('id, indexed')
      .eq('document_id', doc.id)
      .single();

    if (!version) {
      throw new Error('Versão não encontrada');
    }

    console.log(`📋 Versão: ${version.id}`);
    console.log(`✅ Indexada: ${version.indexed}\n`);

    // 2. Contar chunks
    const { count: chunkCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_version_id', version.id);

    console.log(`📦 Total de chunks: ${chunkCount || 0}`);

    // 3. Contar embeddings COM PAGINAÇÃO
    console.log('🔢 Contando embeddings (pode levar alguns segundos)...');
    
    let totalEmbeddings = 0;
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Buscar IDs dos chunks primeiro
    let allChunkIds: string[] = [];
    let chunkFrom = 0;
    let hasMoreChunks = true;

    while (hasMoreChunks) {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id)
        .range(chunkFrom, chunkFrom + pageSize - 1);

      if (!chunks || chunks.length === 0) {
        hasMoreChunks = false;
        break;
      }

      allChunkIds = allChunkIds.concat(chunks.map(c => c.id));
      chunkFrom += pageSize;
      hasMoreChunks = chunks.length === pageSize;
    }

    console.log(`   ${allChunkIds.length} chunk IDs carregados`);

    // Contar embeddings em lotes
    const batchSize = 1000;
    for (let i = 0; i < allChunkIds.length; i += batchSize) {
      const batch = allChunkIds.slice(i, i + batchSize);
      
      const { count } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .in('document_chunk_id', batch);

      totalEmbeddings += count || 0;
      console.log(`   Batch ${Math.floor(i/batchSize) + 1}: ${count || 0} embeddings (total: ${totalEmbeddings})`);
    }

    console.log(`\n📊 RESUMO FINAL:`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`   Chunks:     ${chunkCount || 0}`);
    console.log(`   Embeddings: ${totalEmbeddings}`);
    console.log(`   Status:     ${totalEmbeddings === chunkCount ? '✅ COMPLETO' : '⚠️  INCOMPLETO'}`);
    console.log(`═══════════════════════════════════════════\n`);

  } catch (error) {
    console.error(`\n❌ ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

contarEmbeddings()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
