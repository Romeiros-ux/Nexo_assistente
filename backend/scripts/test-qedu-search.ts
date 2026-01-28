import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testQEduData() {
  console.log('\n🔍 DIAGNÓSTICO DOS DADOS QEDU\n');
  
  // 1. Verificar documentos QEdu indexados
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name, document_type, source_url, status, created_at')
    .or('name.ilike.%QEdu%,name.ilike.%Taxas%Rendimento%,name.ilike.%Saquarema%Saeb%')
    .order('created_at', { ascending: false })
    .limit(15);

  console.log(`📚 Documentos encontrados: ${docs?.length}\n`);
  docs?.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.name}`);
    console.log(`   Tipo: ${doc.document_type} | Status: ${doc.status}`);
    console.log(`   URL: ${doc.source_url?.substring(0, 60)}...`);
  });

  // 2. Verificar chunks e embeddings
  console.log('\n🔬 ANÁLISE DETALHADA:\n');
  
  for (const doc of (docs || []).slice(0, 3)) {
    const { data: version } = await supabase
      .from('document_versions')
      .select('id, indexed')
      .eq('document_id', doc.id)
      .single();

    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_version_id', version?.id);

    let embeddingsCount = 0;
    if (chunks && chunks.length > 0) {
      const { count } = await supabase
        .from('document_embeddings')
        .select('id', { count: 'exact', head: true })
        .in('document_chunk_id', chunks.map(c => c.id));
      embeddingsCount = count || 0;
    }

    console.log(`📄 ${doc.name}`);
    console.log(`   Indexado: ${version?.indexed ? '✅' : '❌'}`);
    console.log(`   Chunks: ${chunks?.length || 0}`);
    console.log(`   Embeddings: ${embeddingsCount}`);
    
    if (chunks && chunks.length > 0) {
      console.log(`   Preview: ${chunks[0].content.substring(0, 150)}...`);
    }
    console.log('');
  }
}

testQEduData().catch(console.error);
