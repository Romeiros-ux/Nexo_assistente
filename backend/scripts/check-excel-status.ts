import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Buscar documentos Excel
  const { data: docs, error } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      document_type,
      uploaded_at
    `)
    .or('name.ilike.%.xlsx,name.ilike.%territorios%,name.ilike.%ideb%,name.ilike.%permanencias%,name.ilike.%distorcao%,name.ilike.%saeb%,name.ilike.%taxa_rendimento%');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`\n📊 Documentos Excel encontrados: ${docs?.length || 0}\n`);

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      console.log(`  ID: ${doc.id}`);
      console.log(`  Nome: ${doc.name}`);
      console.log(`  Tipo: ${doc.document_type}`);
      console.log(`  Criado em: ${doc.uploaded_at}`);
      
      // Verificar se tem versão
      const { data: versions } = await supabase
        .from('document_versions')
        .select('id, version, indexed')
        .eq('document_id', doc.id);

      console.log(`  Versões: ${versions?.length || 0}`);
      
      if (versions && versions.length > 0) {
        versions.forEach(v => {
          console.log(`    - v${v.version}: ${v.indexed ? '✅ Indexed' : '❌ Not indexed'}`);
        });
      }

      // Verificar chunks
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_id', doc.id);

      console.log(`  Chunks: ${chunks?.length || 0}`);
      console.log('');
    }
  }
}

main().catch(console.error);
