/**
 * Extrair conteúdo real dos sites indexados
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 CONTEÚDO REAL EXTRAÍDO DOS SITES QEDU\n');
  console.log('Pergunta simulada: "Qual o IDEB dos anos iniciais de 2023?"\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Buscar chunks que mencionam IDEB
  const { data, error } = await supabase
    .from('document_chunks')
    .select(`
      content,
      chunk_index,
      document_versions!inner (
        documents!inner (
          name,
          subdomain,
          file_url
        )
      )
    `)
    .ilike('content', '%ideb%')
    .eq('document_versions.documents.document_type', 'OTHER')
    .limit(10);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Nenhum conteúdo encontrado!\n');
    return;
  }

  console.log(`✅ Encontrados ${data.length} chunks com "IDEB"\n`);

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const chunk = data[i];
    const doc = (chunk.document_versions as any)?.documents;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📄 CHUNK ${i + 1}`);
    console.log(`   Documento: ${doc?.name}`);
    console.log(`   Subdomínio: ${doc?.subdomain}`);
    console.log(`   URL: ${doc?.file_url}`);
    console.log(`   Índice: ${chunk.chunk_index}\n`);
    console.log(`📋 CONTEÚDO:\n`);
    console.log(chunk.content);
    console.log(`\n`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(console.error);
