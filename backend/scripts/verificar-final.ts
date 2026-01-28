import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFinal() {
  console.log('🎯 VERIFICAÇÃO FINAL DO CADASTRO DE TRABALHADORES\n');
  console.log('═'.repeat(60) + '\n');

  try {
    // 1. Buscar documento
    const { data: doc } = await supabase
      .from('documents')
      .select('id, name, status, created_at')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    if (!doc) {
      throw new Error('Documento não encontrado');
    }

    console.log(`📄 DOCUMENTO`);
    console.log(`   Nome: ${doc.name}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   ID: ${doc.id}\n`);

    // 2. Buscar versão
    const { data: version } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', doc.id)
      .single();

    if (!version) {
      throw new Error('Versão não encontrada');
    }

    console.log(`📋 VERSÃO`);
    console.log(`   Número: ${version.version_number}`);
    console.log(`   Status: ${version.status}`);
    console.log(`   Indexada: ${version.indexed ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   ID: ${version.id}\n`);

    // 3. Contar chunks
    const { count: chunkCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_version_id', version.id);

    console.log(`📦 CHUNKS`);
    console.log(`   Total: ${chunkCount || 0} chunks`);

    // 4. Buscar amostra de chunks
    const { data: sampleChunks } = await supabase
      .from('document_chunks')
      .select('id, chunk_index, content')
      .eq('document_version_id', version.id)
      .order('chunk_index', { ascending: true })
      .limit(3);

    if (sampleChunks && sampleChunks.length > 0) {
      console.log(`   Primeiros chunks:`);
      sampleChunks.forEach(c => {
        console.log(`   - Chunk #${c.chunk_index}: ${c.content.substring(0, 50)}...`);
      });
    }
    console.log();

    // 5. Contar embeddings DIRETO (sem subquery complexa)
    console.log(`🔢 EMBEDDINGS`);
    console.log(`   Contando... (pode levar alguns segundos)`);
    
    // Query SQL simples via RPC ou count direto
    const { count: embeddingCount, error: countError } = await supabase
      .from('document_embeddings')
      .select('document_chunk_id', { count: 'exact', head: true })
      .eq('model', 'text-embedding-3-large');

    if (countError) {
      console.log(`   ⚠️  Erro ao contar: ${countError.message}`);
      console.log(`   Tentando método alternativo...`);
      
      // Contar por batches
      let total = 0;
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('document_embeddings')
          .select('id')
          .range(from, from + pageSize - 1);
        
        if (error || !data || data.length === 0) break;
        
        total += data.length;
        from += pageSize;
        
        if (data.length < pageSize) break;
      }
      
      console.log(`   Total: ${total} embeddings`);
    } else {
      console.log(`   Total: ${embeddingCount || 0} embeddings (todos os modelos)`);
    }

    // 6. Verificar embedding específico
    if (sampleChunks && sampleChunks.length > 0) {
      const { data: sampleEmbedding } = await supabase
        .from('document_embeddings')
        .select('id, model, tokens_used')
        .eq('document_chunk_id', sampleChunks[0].id)
        .single();

      if (sampleEmbedding) {
        console.log(`   ✅ Embedding encontrado para chunk #0`);
        console.log(`      Modelo: ${sampleEmbedding.model}`);
        console.log(`      Tokens: ${sampleEmbedding.tokens_used}`);
      } else {
        console.log(`   ❌ Nenhum embedding para chunk #0`);
      }
    }

    console.log(`\n` + '═'.repeat(60));
    console.log(`\n✅ VERIFICAÇÃO CONCLUÍDA!\n`);

    // 7. Buscar funcionário de teste
    console.log(`🔍 TESTE DE BUSCA: Abel Barbosa`);
    const { data: searchResult } = await supabase
      .from('document_chunks')
      .select('chunk_index, content')
      .eq('document_version_id', version.id)
      .ilike('content', '%Abel Barbosa%')
      .limit(1)
      .single();

    if (searchResult) {
      console.log(`   ✅ Encontrado no chunk #${searchResult.chunk_index}`);
      console.log(`   Conteúdo: ${searchResult.content.substring(0, 150)}...`);
    } else {
      console.log(`   ❌ Não encontrado`);
    }

    console.log();

  } catch (error) {
    console.error(`\n❌ ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

verificarFinal()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
