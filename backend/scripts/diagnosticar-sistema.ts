/**
 * Script de diagnóstico completo do sistema de busca
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnosticar() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         DIAGNÓSTICO DO SISTEMA DE BUSCA               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. Verificar se a função match_chunks_by_domain existe
  console.log('📋 1. VERIFICANDO FUNÇÃO SQL...\n');
  const { data: functions, error: funcError } = await supabase.rpc('match_chunks_by_domain', {
    query_embedding: new Array(1536).fill(0),
    match_threshold: 0.7,
    match_count: 1,
    filter_domain: 'INDICADORES_EDUCACIONAIS',
    filter_subdomain: 'IDEB'
  });

  if (funcError) {
    console.log('❌ Função match_chunks_by_domain NÃO EXISTE ou tem erro:');
    console.log(`   Erro: ${funcError.message}\n`);
    console.log('🔧 SOLUÇÃO: Execute o arquivo migrations/create-match-chunks-by-domain.sql no Supabase SQL Editor\n');
  } else {
    console.log('✅ Função match_chunks_by_domain existe e funciona!\n');
  }

  // 2. Verificar documentos IDEB
  console.log('📊 2. VERIFICANDO DOCUMENTOS IDEB...\n');
  const { data: idebDocs, error: idebError } = await supabase
    .from('documents')
    .select('id, name, document_type, domain, subdomain, metadata_year, education_stage')
    .eq('domain', 'INDICADORES_EDUCACIONAIS')
    .eq('subdomain', 'IDEB')
    .order('name');

  if (idebError) {
    console.log(`❌ Erro ao buscar documentos IDEB: ${idebError.message}\n`);
  } else if (!idebDocs || idebDocs.length === 0) {
    console.log('⚠️ NENHUM documento IDEB encontrado!\n');
    console.log('🔧 SOLUÇÃO: Execute o script de classificação:');
    console.log('   npx tsx scripts/classify-excel-documents.ts\n');
  } else {
    console.log(`✅ Encontrados ${idebDocs.length} documentos IDEB:\n`);
    idebDocs.forEach(doc => {
      console.log(`   - ${doc.name}`);
      console.log(`     Tipo: ${doc.document_type} | Ano: ${doc.metadata_year || 'N/A'} | Etapa: ${doc.education_stage || 'N/A'}`);
    });
    console.log();
  }

  // 3. Verificar se documentos IDEB têm chunks
  if (idebDocs && idebDocs.length > 0) {
    console.log('📝 3. VERIFICANDO CHUNKS DOS DOCUMENTOS IDEB...\n');
    
    for (const doc of idebDocs) {
      const { data: chunks, error: chunkError } = await supabase
        .from('document_chunks')
        .select('id, content')
        .eq('document_id', doc.id)
        .limit(1);

      if (chunkError) {
        console.log(`   ❌ Erro ao buscar chunks de ${doc.name}: ${chunkError.message}`);
      } else if (!chunks || chunks.length === 0) {
        console.log(`   ⚠️ ${doc.name}: SEM CHUNKS!`);
      } else {
        console.log(`   ✅ ${doc.name}: ${chunks.length} chunk(s)`);
        console.log(`      Prévia: ${chunks[0].content.substring(0, 100)}...`);
      }
    }
    console.log();
  }

  // 4. Verificar se chunks têm embeddings
  if (idebDocs && idebDocs.length > 0) {
    console.log('🔢 4. VERIFICANDO EMBEDDINGS DOS CHUNKS IDEB...\n');
    
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id')
      .in('document_id', idebDocs.map(d => d.id));

    if (chunks && chunks.length > 0) {
      const { data: embeddings, error: embError } = await supabase
        .from('document_embeddings')
        .select('chunk_id')
        .in('chunk_id', chunks.map(c => c.id));

      if (embError) {
        console.log(`   ❌ Erro ao buscar embeddings: ${embError.message}\n`);
      } else if (!embeddings || embeddings.length === 0) {
        console.log('   ⚠️ NENHUM embedding encontrado para chunks IDEB!\n');
        console.log('🔧 SOLUÇÃO: Reindexe os documentos IDEB\n');
      } else {
        console.log(`   ✅ ${embeddings.length} embeddings encontrados\n`);
      }
    }
  }

  // 5. Verificar estrutura de colunas
  console.log('🏗️ 5. VERIFICANDO ESTRUTURA DA TABELA DOCUMENTS...\n');
  const { data: columns, error: colError } = await supabase
    .from('documents')
    .select('*')
    .limit(1)
    .single();

  if (colError && colError.code !== 'PGRST116') {
    console.log(`   ❌ Erro: ${colError.message}\n`);
  } else if (columns) {
    const hasRequiredColumns = 
      'domain' in columns &&
      'subdomain' in columns &&
      'metadata_year' in columns &&
      'education_stage' in columns &&
      'keywords' in columns;

    if (hasRequiredColumns) {
      console.log('   ✅ Todas as colunas necessárias existem:');
      console.log('      - domain ✅');
      console.log('      - subdomain ✅');
      console.log('      - metadata_year ✅');
      console.log('      - education_stage ✅');
      console.log('      - keywords ✅\n');
    } else {
      console.log('   ⚠️ Faltam colunas na tabela documents!\n');
      console.log('🔧 SOLUÇÃO: Execute a migration add-domain-metadata.sql no Supabase\n');
    }
  }

  // 6. Teste de busca real
  console.log('🔍 6. TESTE DE BUSCA REAL...\n');
  console.log('   Query: "Qual etapa está com a pior nota do ideb em 2023?"\n');
  
  // Simular embedding (array de zeros)
  const testEmbedding = new Array(1536).fill(0);
  
  const { data: searchResults, error: searchError } = await supabase.rpc('match_chunks_by_domain', {
    query_embedding: testEmbedding,
    match_threshold: 0.01,
    match_count: 5,
    filter_domain: 'INDICADORES_EDUCACIONAIS',
    filter_subdomain: 'IDEB',
    filter_year: 2023
  });

  if (searchError) {
    console.log(`   ❌ Erro na busca: ${searchError.message}\n`);
  } else if (!searchResults || searchResults.length === 0) {
    console.log('   ⚠️ Busca retornou 0 resultados\n');
    console.log('   Possíveis causas:');
    console.log('   1. Documentos não têm embeddings');
    console.log('   2. Filtros muito restritivos');
    console.log('   3. Threshold muito alto\n');
  } else {
    console.log(`   ✅ Busca retornou ${searchResults.length} resultados:\n`);
    searchResults.forEach((r: any, i: number) => {
      console.log(`   ${i + 1}. ${r.document_name}`);
      console.log(`      Tipo: ${r.document_type} | Ano: ${r.metadata_year || 'N/A'} | Etapa: ${r.education_stage || 'N/A'}`);
      console.log(`      Similaridade: ${(r.similarity * 100).toFixed(1)}%`);
    });
    console.log();
  }

  // 7. Resumo e próximos passos
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📋 RESUMO DO DIAGNÓSTICO:\n');
  
  let problemas = [];
  
  if (funcError) {
    problemas.push('❌ Função SQL match_chunks_by_domain não existe');
  }
  
  if (!idebDocs || idebDocs.length === 0) {
    problemas.push('❌ Nenhum documento IDEB classificado');
  }
  
  if (problemas.length === 0) {
    console.log('✅ Sistema está configurado corretamente!\n');
    console.log('📝 Próximo passo: Testar no frontend\n');
  } else {
    console.log('⚠️ Problemas encontrados:\n');
    problemas.forEach(p => console.log(`   ${p}`));
    console.log('\n🔧 SOLUÇÕES:\n');
    console.log('1. Execute migrations/create-match-chunks-by-domain.sql no Supabase');
    console.log('2. Execute npx tsx scripts/classify-excel-documents.ts');
    console.log('3. Verifique se os arquivos Excel foram indexados corretamente\n');
  }
}

diagnosticar().catch(console.error);
