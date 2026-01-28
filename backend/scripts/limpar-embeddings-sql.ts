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
  console.log('🧹 Limpando embeddings do Cadastro de Trabalhadores via SQL...\n');

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

    // 3. Executar DELETE via SQL (RPC)
    console.log('🗑️  Deletando embeddings via SQL...');

    const { data, error } = await supabase.rpc('delete_embeddings_by_version', {
      version_id: version.id
    });

    if (error) {
      // Se a função RPC não existir, vamos usar uma query SQL raw
      console.log('⚠️  RPC não disponível, usando abordagem alternativa...');
      
      // Buscar IDs dos chunks primeiro
      const { data: chunksData } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id);
      
      const chunkIds = chunksData?.map((c: any) => c.id) || [];
      
      // Contar embeddings
      const { count } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .in('document_chunk_id', chunkIds);

      console.log(`📊 Embeddings encontrados: ${count || 0}`);

      if (!count || count === 0) {
        console.log('✅ Nenhum embedding para deletar!\n');
        return;
      }

      // Instruções para executar manualmente no Supabase SQL Editor
      console.log('\n📝 Execute a seguinte query no Supabase SQL Editor:\n');
      console.log('─'.repeat(70));
      console.log(`
DELETE FROM document_embeddings
WHERE document_chunk_id IN (
  SELECT id FROM document_chunks
  WHERE document_version_id = '${version.id}'
);
      `.trim());
      console.log('─'.repeat(70));
      console.log('\n⚠️  Após executar a query, rode o script de reindexação novamente.\n');
      
    } else {
      console.log(`✅ Embeddings deletados com sucesso!`);
      console.log(`🎯 Total deletado: ${data}\n`);
    }

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
