import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function main() {
  console.log('🔍 TESTE: Busca Vetorial com Embedding Real\n');

  // 1. Verificar documento
  const { data: doc } = await supabase
    .from('documents')
    .select('id, name, domain, subdomain')
    .eq('name', 'Cadastro de Trabalhadores do Município')
    .single();

  console.log('📄 Documento:', doc);

  if (!doc) {
    console.error('❌ Documento não encontrado!');
    return;
  }

  // 2. Contar chunks e embeddings
  const { data: version } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', doc.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!version) {
    console.log('❌ Versão do documento não encontrada');
    return;
  }

  const { count: chunkCount } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('document_version_id', version.id);

  const { count: embeddingCount } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact', head: true });

  console.log(`📦 Chunks: ${chunkCount}`);
  console.log(`🧮 Embeddings: ${embeddingCount}\n`);

  // 3. Gerar embedding REAL da query
  const query = 'Quantos funcionários existem na secretaria de educação?';
  console.log(`Query: "${query}"`);

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;
  console.log(`✅ Embedding gerado (${queryEmbedding.length} dimensões)\n`);

  // 4. Testar busca com a função CORRETA
  console.log('🔍 Testando match_chunks_by_domain...\n');

  const { data: results, error } = await supabase.rpc('match_chunks_by_domain', {
    query_embedding: queryEmbedding,
    match_threshold: 0.03,
    match_count: 8,
    filter_domain: 'RECURSOS_HUMANOS',
    filter_subdomain: 'SERVIDORES',
    filter_document_type: null,
    filter_year: null,
    filter_education_stage: null
  });

  if (error) {
    console.error('❌ Erro na busca:', error);
    return;
  }

  console.log(`✅ Resultados: ${results?.length || 0}\n`);

  if (results && results.length > 0) {
    console.log('📊 Top 3 resultados:');
    results.slice(0, 3).forEach((r: any, i: number) => {
      console.log(`\n${i + 1}. ${r.document_name}`);
      console.log(`   Similaridade: ${r.similarity.toFixed(4)}`);
      console.log(`   Conteúdo (preview): ${r.content.substring(0, 150)}...`);
    });
  } else {
    console.log('⚠️ Nenhum resultado encontrado!');
    
    // Diagnóstico adicional
    console.log('\n🔍 Diagnóstico:');
    console.log('- Verificando se function match_chunks_by_domain existe...');
    
    const { error: funcError } = await supabase.rpc('match_chunks_by_domain', {
      query_embedding: Array(1536).fill(0),
      match_threshold: 0.0,
      match_count: 1
    });

    if (funcError && funcError.message.includes('not find')) {
      console.error('❌ FUNÇÃO NÃO EXISTE! Você precisa rodar a migration:');
      console.error('   backend/migrations/create-match-chunks-by-domain.sql');
    } else if (funcError) {
      console.error('❌ Erro ao executar função:', funcError);
    } else {
      console.log('✅ Função existe mas não retorna resultados');
      console.log('   Problema pode estar nos embeddings ou no JOIN entre tabelas');
    }
  }
}

main();
