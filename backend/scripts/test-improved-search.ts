/**
 * TEST IMPROVED SEARCH - Testar busca após reindexação melhorada
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function testSearch(query: string) {
  console.log(`\n🔍 TESTANDO BUSCA: "${query}"\n`);

  // 1. Gerar embedding da query
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  });

  const queryEmbedding = response.data[0].embedding;

  // 2. Buscar chunks similares
  const { data: chunks, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.03,
    match_count: 10,
    filter_document_type: null,
    filter_status: null,
    filter_unit_id: null,
  });

  if (error) {
    console.error('❌ Erro na busca:', error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log('❌ Nenhum resultado encontrado\n');
    return;
  }

  console.log(`📊 Encontrados ${chunks.length} chunks\n`);

  // 3. Agrupar por documento
  const docMap = new Map<string, any[]>();
  
  for (const chunk of chunks) {
    const docName = chunk.document_name;
    if (!docMap.has(docName)) {
      docMap.set(docName, []);
    }
    docMap.get(docName)!.push(chunk);
  }

  // 4. Mostrar top 10 documentos
  const docs = Array.from(docMap.entries()).map(([name, chunkList]) => {
    const avgSimilarity = chunkList.reduce((sum, c) => sum + (1 - c.distance), 0) / chunkList.length;
    return {
      name,
      type: chunkList[0].document_type,
      chunkCount: chunkList.length,
      similarity: avgSimilarity * 100,
      topChunk: chunkList[0],
    };
  });

  docs.sort((a, b) => b.similarity - a.similarity);

  console.log('📄 TOP 10 DOCUMENTOS:\n');
  
  docs.slice(0, 10).forEach((doc, idx) => {
    const icon = doc.type === 'REPORT' ? '📊' : doc.type === 'LAW' ? '📜' : '📄';
    console.log(`${idx + 1}. ${icon} ${doc.name}`);
    console.log(`   Tipo: ${doc.type} | Similaridade: ${doc.similarity.toFixed(2)}% | Chunks: ${doc.chunkCount}`);
    console.log(`   Conteúdo (primeiros 200 chars):`);
    console.log(`   "${doc.topChunk.content.substring(0, 200)}..."\n`);
  });

  // 5. Verificar se há documentos Excel nos top 5
  const top5 = docs.slice(0, 5);
  const excelCount = top5.filter(d => d.type === 'REPORT').length;
  
  console.log('📈 ANÁLISE:');
  console.log(`   Documentos REPORT nos top 5: ${excelCount}/5`);
  console.log(`   Documentos LAW nos top 5: ${5 - excelCount}/5\n`);

  if (excelCount > 0) {
    console.log('✅ SUCESSO! Documentos Excel estão nos resultados!\n');
  } else {
    console.log('❌ PROBLEMA! Nenhum documento Excel nos top 5.\n');
  }
}

async function main() {
  console.log('\n🚀 TESTE DE BUSCA APÓS REINDEXAÇÃO MELHORADA\n');

  // Aguardar um pouco para garantir que a indexação terminou
  console.log('⏳ Aguardando 10 segundos...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Testar as queries da usuária
  await testSearch('Qual é a taxa de aprovação em Saquarema em 2023?');
  await testSearch('IDEB de Saquarema 2023');
  await testSearch('distorção idade-série Saquarema');
}

main().catch(console.error);
