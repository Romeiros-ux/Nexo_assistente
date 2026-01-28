import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 BUSCANDO CHUNKS COM DADOS REAIS\n');

  // Buscar documento taxa de rendimento 2023
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .ilike('name', '%taxa_rendimento%2023-AF%')
    .limit(1);

  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento encontrado');
    return;
  }

  const doc = docs[0];
  console.log(`📄 Documento: ${doc.name}\n`);

  // Buscar versão
  const { data: version } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', doc.id)
    .single();

  // Contar total de chunks
  const { count: totalChunks } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_version_id', version?.id);

  console.log(`📊 Total de chunks: ${totalChunks}\n`);

  // Buscar chunks do FINAL (onde devem estar os dados reais)
  const skipChunks = Math.max(0, (totalChunks || 10) - 10); // Últimos 10 chunks
  
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_version_id', version?.id)
    .gte('chunk_index', skipChunks)
    .order('chunk_index', { ascending: true })
    .limit(3);

  if (!chunks || chunks.length === 0) {
    console.log('❌ Nenhum chunk encontrado');
    return;
  }

  console.log(`\n📦 Mostrando últimos 3 chunks do arquivo:\n`);

  chunks.forEach(chunk => {
    console.log(`\n--- Chunk ${chunk.chunk_index} ---`);
    // Mostrar primeiros 2000 caracteres
    console.log(chunk.content.substring(0, 2000));
    if (chunk.content.length > 2000) {
      console.log('\n... (conteúdo truncado)');
    }
    console.log('\n--- Fim do Chunk ---');
  });
}

main().catch(console.error);
