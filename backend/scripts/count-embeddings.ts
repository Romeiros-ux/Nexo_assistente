import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Contar embeddings totais
  const { count: totalEmbeddings } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total de embeddings no banco: ${totalEmbeddings}\n`);

  // Contar chunks totais
  const { count: totalChunks } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  console.log(`📦 Total de chunks no banco: ${totalChunks}\n`);

  // Buscar alguns embeddings de exemplo
  const { data: sampleEmbeddings } = await supabase
    .from('document_embeddings')
    .select('id, document_chunk_id, model, tokens_used')
    .limit(5);

  console.log('📋 Embeddings de exemplo:');
  sampleEmbeddings?.forEach(e => {
    console.log(`   - ID: ${e.id}`);
    console.log(`     Chunk: ${e.document_chunk_id}`);
    console.log(`     Model: ${e.model}`);
    console.log(`     Tokens: ${e.tokens_used}\n`);
  });
}

main().catch(console.error);
