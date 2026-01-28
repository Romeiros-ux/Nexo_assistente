import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Buscar documentos Excel
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .eq('document_type', 'REPORT')
    .like('name', '%territorios%')
    .order('uploaded_at', { ascending: false })
    .limit(3);

  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento encontrado');
    return;
  }

  console.log(`\n📊 Verificando ${docs.length} documentos Excel:\n`);

  for (const doc of docs) {
    console.log(`📄 ${doc.name}`);
    console.log(`   ID: ${doc.id}\n`);

    // Versões
    const { data: versions } = await supabase
      .from('document_versions')
      .select('id, version_number, status, indexed')
      .eq('document_id', doc.id);

    console.log(`   ✅ Versões: ${versions?.length || 0}`);
    if (versions && versions.length > 0) {
      versions.forEach(v => {
        console.log(`      - v${v.version_number}: ${v.status} (indexed: ${v.indexed || false})`);
      });
    }

    // Chunks
    if (versions && versions.length > 0) {
      const versionId = versions[0].id;
      
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, chunk_index')
        .eq('document_version_id', versionId);

      console.log(`   ✅ Chunks: ${chunks?.length || 0}`);

      // Embeddings
      if (chunks && chunks.length > 0) {
        const chunkIds = chunks.map(c => c.id);
        
        const { data: embeddings } = await supabase
          .from('document_embeddings')
          .select('id, chunk_id')
          .in('chunk_id', chunkIds);

        console.log(`   ✅ Embeddings: ${embeddings?.length || 0}`);
        
        if (embeddings && embeddings.length > 0) {
          console.log(`   🎉 Documento totalmente indexado e pesquisável!`);
        } else {
          console.log(`   ⚠️  Chunks criados mas SEM embeddings`);
        }
      }
    } else {
      console.log(`   ❌ Sem versões = sem chunks = sem embeddings`);
    }
    
    console.log('');
  }
}

main().catch(console.error);
