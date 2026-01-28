/**
 * Teste direto do serviço de busca
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function testSearch() {
  console.log('🔍 Testando busca RAG...\n');

  // 1. Gerar embedding real da pergunta
  const query = "O que diz a Lei 2232/2022?";
  console.log(`Pergunta: "${query}"`);
  
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;
  console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões\n`);

  // 2. Buscar chunks
  console.log('Buscando chunks com threshold 0.5...');
  const { data: results, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 10,
    filter_status: 'ACTIVE',
  });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`\n✅ Resultados encontrados: ${results?.length || 0}`);

  if (results && results.length > 0) {
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.document_name}`);
      console.log(`   Similaridade: ${(r.similarity * 100).toFixed(2)}%`);
      console.log(`   Preview: ${r.chunk_content.substring(0, 100)}...`);
    });
  } else {
    console.log('\n⚠️ Nenhum resultado encontrado!');
    console.log('\nVerificando diagnóstico...');
    
    // Diagnóstico
    const { data: embCount } = await supabase
      .from('document_embeddings')
      .select('id', { count: 'exact', head: true });
    
    const { data: docsCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    console.log(`- Total embeddings: ${embCount}`);
    console.log(`- Docs ACTIVE: ${docsCount}`);
  }
}

testSearch().catch(console.error);
