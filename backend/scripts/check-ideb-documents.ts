/**
 * Verificação: Documentos IDEB no banco de dados
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIdebDocuments() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   VERIFICAÇÃO: DOCUMENTOS IDEB');
  console.log('═══════════════════════════════════════════════════════\n');

  // Buscar documentos IDEB
  const { data: idebDocs, error } = await supabase
    .from('documents')
    .select('id, name, document_type, domain, subdomain, metadata_year, education_stage, status')
    .eq('domain', 'INDICADORES_EDUCACIONAIS')
    .eq('subdomain', 'IDEB')
    .order('name');

  if (error) {
    console.log('❌ Erro ao buscar documentos:', error.message, '\n');
    return;
  }

  if (!idebDocs || idebDocs.length === 0) {
    console.log('❌ NENHUM documento IDEB encontrado!\n');
    console.log('🔧 SOLUÇÃO:\n');
    console.log('   Execute: npx tsx scripts/classify-excel-documents.ts\n');
    return;
  }

  console.log(`✅ Encontrados ${idebDocs.length} documentos IDEB:\n`);

  // Agrupar por ano e etapa
  const porAno: Record<number, any[]> = {};
  const porEtapa: Record<string, any[]> = {};

  idebDocs.forEach(doc => {
    // Por ano
    const ano = doc.metadata_year || 0;
    if (!porAno[ano]) porAno[ano] = [];
    porAno[ano].push(doc);

    // Por etapa
    const etapa = doc.education_stage || 'N/A';
    if (!porEtapa[etapa]) porEtapa[etapa] = [];
    porEtapa[etapa].push(doc);
  });

  // Exibir por ano
  console.log('📊 DOCUMENTOS POR ANO:\n');
  Object.keys(porAno)
    .sort((a, b) => Number(b) - Number(a))
    .forEach(ano => {
      const docs = porAno[Number(ano)];
      console.log(`   ${ano}: ${docs.length} documento(s)`);
      docs.forEach(doc => {
        console.log(`      - ${doc.name}`);
        console.log(`        Tipo: ${doc.document_type} | Etapa: ${doc.education_stage || 'N/A'} | Status: ${doc.status}`);
      });
      console.log();
    });

  // Exibir por etapa
  console.log('🎓 DOCUMENTOS POR ETAPA EDUCACIONAL:\n');
  Object.keys(porEtapa)
    .sort()
    .forEach(etapa => {
      const docs = porEtapa[etapa];
      console.log(`   ${etapa}: ${docs.length} documento(s)`);
    });
  console.log();

  // Verificar chunks e embeddings
  console.log('📝 VERIFICANDO CHUNKS E EMBEDDINGS:\n');
  
  for (const doc of idebDocs.slice(0, 3)) { // Verificar primeiros 3
    // Buscar chunks
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_id', doc.id);

    if (!chunks || chunks.length === 0) {
      console.log(`   ❌ ${doc.name}: SEM CHUNKS`);
      continue;
    }

    // Buscar embeddings
    const { data: embeddings } = await supabase
      .from('document_embeddings')
      .select('chunk_id')
      .in('chunk_id', chunks.map(c => c.id));

    const temEmbeddings = embeddings && embeddings.length > 0;
    console.log(`   ${temEmbeddings ? '✅' : '❌'} ${doc.name}: ${chunks.length} chunk(s), ${embeddings?.length || 0} embedding(s)`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ VERIFICAÇÃO CONCLUÍDA');
  console.log('═══════════════════════════════════════════════════════\n');

  // Resumo
  const total = idebDocs.length;
  const com2023 = idebDocs.filter(d => d.metadata_year === 2023).length;
  const ativo = idebDocs.filter(d => d.status === 'ACTIVE').length;

  console.log('📋 RESUMO:\n');
  console.log(`   Total de documentos IDEB: ${total}`);
  console.log(`   Documentos de 2023: ${com2023}`);
  console.log(`   Documentos ativos: ${ativo}\n`);

  if (com2023 === 0) {
    console.log('⚠️ ATENÇÃO: Nenhum documento IDEB de 2023!\n');
    console.log('   Query "IDEB 2023" não vai retornar resultados.\n');
  }
}

checkIdebDocuments().catch(console.error);
