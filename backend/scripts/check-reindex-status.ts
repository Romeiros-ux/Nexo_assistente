import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n📊 STATUS DOS ARQUIVOS EXCEL REINDEXADOS\n');

  const { data: docs } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      document_type,
      uploaded_at,
      document_versions (
        id,
        status,
        indexed
      )
    `)
    .eq('document_type', 'REPORT')
    .order('uploaded_at', { ascending: false });

  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento REPORT encontrado');
    return;
  }

  console.log(`Total de documentos REPORT: ${docs.length}\n`);

  for (const doc of docs) {
    const versions = Array.isArray(doc.document_versions) ? doc.document_versions : [];
    const latestVersion = versions[0];
    
    const status = latestVersion?.status || 'N/A';
    const indexed = latestVersion?.indexed ? '✅' : '❌';
    
    console.log(`${indexed} ${doc.name}`);
    console.log(`   Status: ${status} | Upload: ${new Date(doc.uploaded_at).toLocaleString('pt-BR')}\n`);
  }

  // Contar chunks e embeddings
  const { data: stats } = await supabase
    .rpc('count_excel_stats');

  console.log('\n📈 ESTATÍSTICAS GERAIS:');
  console.log(`   Chunks: ${stats?.[0]?.chunks || 0}`);
  console.log(`   Embeddings: ${stats?.[0]?.embeddings || 0}`);
}

main().catch(console.error);
