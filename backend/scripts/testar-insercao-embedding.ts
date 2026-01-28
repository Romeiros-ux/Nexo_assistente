import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarInsercao() {
  console.log('🧪 Testando inserção de embeddings...\n');

  try {
    // Buscar um chunk qualquer
    const { data: chunk } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1)
      .single();

    if (!chunk) {
      throw new Error('Nenhum chunk encontrado');
    }

    console.log(`📦 Chunk de teste: ${chunk.id.substring(0, 8)}...`);
    console.log(`   Conteúdo: "${chunk.content.substring(0, 50)}..."\n`);

    // Tentar inserir um embedding de teste
    const testEmbedding = {
      id: crypto.randomUUID(),
      document_chunk_id: chunk.id,
      embedding: Array(1536).fill(0.1), // Vetor fake de 1536 dimensões
      model: 'text-embedding-3-large',
      model_version: '1',
      tokens_used: 10
    };

    console.log('💾 Inserindo embedding de teste...');
    const { data, error } = await supabase
      .from('document_embeddings')
      .insert(testEmbedding)
      .select();

    if (error) {
      console.error(`❌ ERRO ao inserir: ${error.message}`);
      console.error(`   Código: ${error.code}`);
      console.error(`   Detalhes: ${JSON.stringify(error.details, null, 2)}`);
      return;
    }

    console.log(`✅ Embedding inserido com sucesso!`);
    console.log(`   ID: ${data[0].id}\n`);

    // Verificar se realmente foi inserido
    const { count } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('id', data[0].id);

    console.log(`🔍 Verificação: ${count} registro(s) encontrado(s)`);

    // Limpar teste
    console.log('🧹 Limpando embedding de teste...');
    await supabase
      .from('document_embeddings')
      .delete()
      .eq('id', data[0].id);

    console.log('✅ Teste concluído com sucesso!\n');

  } catch (error) {
    console.error(`\n❌ ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

testarInsercao()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
