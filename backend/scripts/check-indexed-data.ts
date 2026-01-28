import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Verificando estrutura...\n');

  // Verificar documentos
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, name, domain, subdomain')
    .eq('name', 'Cadastro de Trabalhadores do Município');

  if (docsError) {
    console.error('❌ Erro ao buscar documentos:', docsError);
    return;
  }

  console.log('📄 Documentos encontrados:', docs?.length);
  docs?.forEach(doc => {
    console.log(`  - ${doc.id}: ${doc.name}`);
    console.log(`    Domain: ${doc.domain}, Subdomain: ${doc.subdomain}`);
  });

  if (!docs || docs.length === 0) return;

  const docId = docs[0].id;

  // Verificar versões
  const { data: versions, error: versionsError } = await supabase
    .from('document_versions')
    .select('id, status')
    .eq('document_id', docId);

  console.log('\n📋 Versões encontradas:', versions?.length);
  versions?.forEach(v => {
    console.log(`  - ${v.id}: ${v.status}`);
  });

  if (!versions || versions.length === 0) return;

  const versionId = versions[0].id;

  // Verificar chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('document_chunks')
    .select('id')
    .eq('document_version_id', versionId);

  console.log('\n📦 Chunks encontrados:', chunks?.length);

  if (!chunks || chunks.length === 0) return;

  // Verificar embeddings
  const { data: embeddings, error: embError } = await supabase
    .from('document_embeddings')
    .select('id')
    .in('document_chunk_id', chunks.map(c => c.id));

  console.log('🧮 Embeddings encontrados:', embeddings?.length);

  // Testar busca vetorial simples
  console.log('\n🔍 Testando busca vetorial...');
  
  const { data: searchResult, error: searchError } = await supabase.rpc('match_document_chunks', {
    query_embedding: Array(1536).fill(0), // Embedding zero para teste
    match_threshold: 0.03,
    match_count: 5,
    filter_domain: 'RECURSOS_HUMANOS',
    filter_subdomain: 'SERVIDORES'
  });

  if (searchError) {
    console.error('❌ Erro na busca:', searchError);
  } else {
    console.log('✅ Busca retornou:', searchResult?.length, 'resultados');
  }
}

main();
