import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 BUSCANDO CHUNKS DOS ARQUIVOS EXCEL\n');

  // Buscar documento Excel de taxa de rendimento
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .ilike('name', '%taxa_rendimento%')
    .limit(1);

  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento encontrado');
    return;
  }

  const doc = docs[0];
  console.log(`📄 Documento: ${doc.name}\n`);

  // Buscar a versão do documento
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', doc.id);

  if (!versions || versions.length === 0) {
    console.log('❌ Nenhuma versão encontrada');
    return;
  }

  const versionId = versions[0].id;
  console.log(`📋 Versão ID: ${versionId}\n`);

  // Buscar os 3 primeiros chunks
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_version_id', versionId)
    .order('chunk_index', { ascending: true })
    .limit(3);

  if (!chunks || chunks.length === 0) {
    console.log('❌ Nenhum chunk encontrado');
    return;
  }

  console.log(`📦 Encontrados ${chunks.length} chunks:\n`);

  chunks.forEach((chunk) => {
    console.log(`\n--- Chunk ${chunk.chunk_index} ---`);
    console.log(chunk.content);
    console.log(`--- Fim do Chunk ${chunk.chunk_index} ---\n`);
  });
}

main().catch(console.error);
