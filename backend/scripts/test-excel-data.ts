import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 BUSCANDO DADOS DE SAQUAREMA NOS CHUNKS\n');

  // Buscar documento taxa de rendimento 2023
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .ilike('name', '%taxa_rendimento%2023%')
    .limit(1);

  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento encontrado');
    return;
  }

  const doc = docs[0];
  console.log(`📄 Documento: ${doc.name}`);

  // Buscar versão
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, indexed')
    .eq('document_id', doc.id)
    .single();

  console.log(`📋 Versão ID: ${versions?.id}`);
  console.log(`✅ Indexed: ${versions?.indexed}`);

  // Buscar chunks que contenham "Saquarema" ou código "3305505"
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_version_id', versions?.id)
    .or('content.ilike.%Saquarema%,content.ilike.%3305505%')
    .order('chunk_index', { ascending: true })
    .limit(3);

  if (!chunks || chunks.length === 0) {
    console.log('\n❌ Nenhum chunk com dados de Saquarema encontrado');
    console.log('Vou buscar chunks do meio do arquivo (onde costumam estar os dados)...\n');

    // Buscar chunks do meio (pulando o dicionário)
    const { data: middleChunks } = await supabase
      .from('document_chunks')
      .select('id, content, chunk_index')
      .eq('document_version_id', versions?.id)
      .gte('chunk_index', 10)
      .lte('chunk_index', 15)
      .order('chunk_index', { ascending: true })
      .limit(3);

    if (middleChunks) {
      console.log(`\n📦 Encontrados ${middleChunks.length} chunks do meio do arquivo:\n`);
      middleChunks.forEach(chunk => {
        console.log(`\n--- Chunk ${chunk.chunk_index} ---`);
        console.log(chunk.content.substring(0, 1500));
        console.log('--- Fim do Chunk ---\n');
      });
    }
  } else {
    console.log(`\n📦 Encontrados ${chunks.length} chunks com dados de Saquarema:\n`);

    chunks.forEach(chunk => {
      console.log(`\n--- Chunk ${chunk.chunk_index} ---`);
      console.log(chunk.content);
      console.log('--- Fim do Chunk ---\n');
    });
  }

  // Verificar se há embeddings para esses chunks
  const { data: embCount } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact', head: true })
    .in('document_chunk_id', chunks?.map(c => c.id) || []);

  console.log(`\n🔢 Embeddings para esses chunks: ${embCount || 0}`);
}

main().catch(console.error);
