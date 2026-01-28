/**
 * Buscar especificamente na página IDEB/Escolas
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 CONTEÚDO DA PÁGINA: IDEB POR ESCOLA\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Buscar especificamente a página qedu_ideb
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
    .eq('document_versions.documents.name', 'qedu_ideb_saquarema.html')
    .order('chunk_index');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Página IDEB/Escolas não encontrada!\n');
    return;
  }

  console.log(`✅ Página encontrada com ${data.length} chunks\n`);

  data.forEach((chunk, i) => {
    const doc = (chunk.document_versions as any)?.documents;
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📄 CHUNK ${i + 1}/${data.length}`);
    console.log(`   URL: ${doc?.file_url}`);
    console.log(`   Índice: ${chunk.chunk_index}\n`);
    console.log(`📋 CONTEÚDO COMPLETO:\n`);
    console.log(chunk.content);
    console.log(`\n`);
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(console.error);
