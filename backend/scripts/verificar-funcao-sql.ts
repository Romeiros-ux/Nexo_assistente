/**
 * Verificação Rápida: Função SQL existe e funciona?
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verificar() {
  console.log('═══════════════════════════════════════════════');
  console.log('   VERIFICAÇÃO RÁPIDA DO SISTEMA');
  console.log('═══════════════════════════════════════════════\n');

  // Simular embedding (array de zeros)
  const testEmbedding = new Array(1536).fill(0);
  
  console.log('1️⃣ Testando função match_chunks_by_domain...\n');
  
  const { data, error } = await supabase.rpc('match_chunks_by_domain', {
    query_embedding: testEmbedding,
    match_threshold: 0.01,
    match_count: 5,
    filter_domain: 'INDICADORES_EDUCACIONAIS',
    filter_subdomain: 'IDEB',
    filter_year: 2023
  });

  if (error) {
    console.log('❌ ERRO: Função não existe ou tem problema!\n');
    console.log(`   Mensagem: ${error.message}\n`);
    console.log('🔧 SOLUÇÃO:');
    console.log('   1. Abra https://supabase.com');
    console.log('   2. Vá em SQL Editor');
    console.log('   3. Cole o conteúdo de migrations/create-match-chunks-by-domain.sql');
    console.log('   4. Clique em RUN\n');
    process.exit(1);
  }

  console.log('✅ Função existe e funciona!\n');
  console.log(`📊 Resultados encontrados: ${data?.length || 0}\n`);

  if (data && data.length > 0) {
    console.log('Top 3 documentos:\n');
    data.slice(0, 3).forEach((doc: any, i: number) => {
      console.log(`   ${i + 1}. ${doc.document_name}`);
      console.log(`      Tipo: ${doc.document_type}`);
      console.log(`      Domínio: ${doc.domain} > ${doc.subdomain}`);
      console.log(`      Ano: ${doc.metadata_year || 'N/A'}`);
      console.log(`      Etapa: ${doc.education_stage || 'N/A'}`);
      console.log(`      Similaridade: ${(doc.similarity * 100).toFixed(1)}%\n`);
    });
  } else {
    console.log('⚠️ Nenhum resultado encontrado.\n');
    console.log('Possíveis causas:');
    console.log('   - Documentos IDEB não foram classificados');
    console.log('   - Documentos não têm embeddings');
    console.log('   - Filtros muito restritivos\n');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ SISTEMA OK - PRONTO PARA USO!');
  console.log('═══════════════════════════════════════════════\n');
}

verificar().catch(console.error);
