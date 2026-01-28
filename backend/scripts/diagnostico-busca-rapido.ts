import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO DA BUSCA\n');

  try {
    // 1. Verificar documento
    const { data: doc } = await supabase
      .from('documents')
      .select('id, name, domain, subdomain, status')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    console.log('📄 Documento:');
    console.log(`   Nome: ${doc?.name || 'N/A'}`);
    console.log(`   Domain: ${doc?.domain || 'NULL ❌'}`);
    console.log(`   Subdomain: ${doc?.subdomain || 'NULL ❌'}`);
    console.log(`   Status: ${doc?.status}\n`);

    // 2. Testar busca COM filtro
    console.log('🔍 Testando match_chunks_by_domain...\n');
    
    const fakeEmbedding = Array(1536).fill(0.001);
    
    const { data: results, error } = await supabase.rpc(
      'match_chunks_by_domain',
      {
        query_embedding: fakeEmbedding,
        match_threshold: 0.0,
        match_count: 5,
        filter_domain: 'RECURSOS_HUMANOS',
        filter_subdomain: 'SERVIDORES',
        filter_document_type: null,
        filter_year: null,
        filter_education_stage: null
      }
    );

    if (error) {
      console.error(`❌ Erro: ${error.message}\n`);
    } else {
      console.log(`Resultados: ${results?.length || 0} chunks`);
      if (results && results.length > 0) {
        results.slice(0, 2).forEach((r: any, i: number) => {
          console.log(`  ${i+1}. ${r.document_name} (${r.domain}/${r.subdomain})`);
        });
      }
    }

  } catch (error) {
    console.error(`\n❌ ${error}\n`);
  }
}

diagnosticar().then(() => process.exit(0));
