import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function verificarEmbeddings() {
  console.log('🔍 VERIFICANDO EMBEDDINGS DO CADASTRO\n');

  try {
    // 1. Buscar documento
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    if (!doc) {
      console.error('❌ Documento não encontrado');
      return;
    }

    console.log(`📄 Document ID: ${doc.id}\n`);

    // 2. Buscar versão
    const { data: version } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .single();

    if (!version) {
      console.error('❌ Versão não encontrada');
      return;
    }

    console.log(`📋 Version ID: ${version.id}\n`);

    // 3. Contar chunks
    const { count: chunkCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_version_id', version.id);

    console.log(`📦 Chunks: ${chunkCount || 0}\n`);

    // 4. Buscar alguns chunk IDs
    const { data: sampleChunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_version_id', version.id)
      .limit(3);

    if (!sampleChunks || sampleChunks.length === 0) {
      console.error('❌ Nenhum chunk encontrado');
      return;
    }

    console.log(`Chunk IDs (amostra):`);
    sampleChunks.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.id}`);
    });
    console.log();

    // 5. Verificar embeddings para esses chunks
    console.log('🔢 Verificando embeddings...\n');
    
    for (const chunk of sampleChunks) {
      const { data: emb, count } = await supabase
        .from('document_embeddings')
        .select('id, model', { count: 'exact' })
        .eq('document_chunk_id', chunk.id);

      console.log(`Chunk ${chunk.id.substring(0, 8)}...:`);
      console.log(`  Embeddings: ${count || 0}`);
      if (emb && emb.length > 0) {
        console.log(`  Modelo: ${emb[0].model}`);
      }
    }

    console.log();

    // 6. Testar query manual para ver o JOIN
    console.log('🔍 Testando query manual com JOINs...\n');
    
    const { data: testData, error: testError } = await supabase
      .from('document_embeddings')
      .select(`
        id,
        document_chunks!inner (
          id,
          document_versions!inner (
            id,
            documents!inner (
              id,
              name,
              domain,
              subdomain,
              status
            )
          )
        )
      `)
      .limit(1);

    if (testError) {
      console.error(`❌ Erro na query: ${testError.message}`);
    } else if (testData && testData.length > 0) {
      console.log('✅ Query com JOINs funcionou!');
      console.log('Documento encontrado:', JSON.stringify(testData[0], null, 2).substring(0, 200));
    } else {
      console.log('⚠️  Query não retornou resultados');
    }

  } catch (error) {
    console.error(`\n❌ ${error}\n`);
  }
}

verificarEmbeddings().then(() => process.exit(0));
