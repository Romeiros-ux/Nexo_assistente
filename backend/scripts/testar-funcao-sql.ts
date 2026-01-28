import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testarFuncaoSQL() {
  console.log('🧪 TESTANDO FUNÇÃO SQL match_chunks_by_domain\n');

  try {
    // Criar um embedding fake (vetor de 1536 dimensões)
    const fakeEmbedding = Array(1536).fill(0.5);

    console.log('Chamando função com parâmetros:');
    console.log('  - query_embedding: vetor(1536) com valores 0.5');
    console.log('  - match_threshold: 0.0');
    console.log('  - match_count: 10');
    console.log('  - filter_domain: RECURSOS_HUMANOS');
    console.log('  - filter_subdomain: SERVIDORES\n');

    const { data, error } = await supabase.rpc('match_chunks_by_domain', {
      query_embedding: fakeEmbedding,
      match_threshold: 0.0,
      match_count: 10,
      filter_domain: 'RECURSOS_HUMANOS',
      filter_subdomain: 'SERVIDORES',
      filter_document_type: null,
      filter_year: null,
      filter_education_stage: null
    });

    if (error) {
      console.error(`❌ Erro ao chamar função:`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details: ${error.details}`);
      console.error(`   Hint: ${error.hint}\n`);
      
      console.log('Possíveis causas:');
      console.log('  1. Função não existe no banco');
      console.log('  2. Assinatura da função está diferente');
      console.log('  3. Tipo vector(1536) não é compatível\n');
      
      console.log('Execute no Supabase SQL Editor:');
      console.log('  SELECT * FROM pg_proc WHERE proname = \'match_chunks_by_domain\';');
      return;
    }

    console.log(`✅ Função executada com sucesso!`);
    console.log(`   Resultados: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
      data.slice(0, 3).forEach((r: any, i: number) => {
        console.log(`  ${i+1}. ${r.document_name}`);
        console.log(`     Domain: ${r.domain}, Subdomain: ${r.subdomain}`);
        console.log(`     Similarity: ${(r.similarity * 100).toFixed(2)}%`);
      });
    } else {
      console.log('⚠️  Função retornou 0 resultados');
      console.log('\nIsso pode significar que:');
      console.log('  - A lógica de filtro na função está incorreta');
      console.log('  - Os JOINs na função não estão funcionando');
      console.log('  - Há um problema com o cálculo de similaridade\n');
      
      console.log('Ação sugerida:');
      console.log('  - Verificar o código da função no arquivo:');
      console.log('    backend/migrations/create-match-chunks-by-domain.sql');
      console.log('  - Ou criar uma função alternativa mais simples');
    }

  } catch (error) {
    console.error(`\n❌ Exceção: ${error}\n`);
  }
}

testarFuncaoSQL().then(() => process.exit(0));
