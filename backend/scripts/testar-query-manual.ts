import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testarQueryManual() {
  console.log('🧪 TESTANDO QUERY MANUAL (igual à função SQL)\n');

  try {
    // Simular a query dentro da função match_chunks_by_domain
    const { data, error, count } = await supabase
      .from('document_embeddings')
      .select(`
        id,
        document_chunks!inner (
          id,
          content,
          document_versions!inner (
            id,
            documents!inner (
              id,
              name,
              domain,
              subdomain,
              status
            )
          )
        )
      `, { count: 'exact' })
      .eq('document_chunks.document_versions.documents.domain', 'RECURSOS_HUMANOS')
      .eq('document_chunks.document_versions.documents.subdomain', 'SERVIDORES')
      .eq('document_chunks.document_versions.documents.status', 'ACTIVE')
      .limit(5);

    if (error) {
      console.error(`❌ Erro: ${error.message}\n`);
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    console.log(`✅ Query executada com sucesso!`);
    console.log(`   Total encontrado: ${count || 0}`);
    console.log(`   Retornados: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
      console.log('Primeiros resultados:');
      data.slice(0, 2).forEach((row: any, i: number) => {
        const doc = row.document_chunks?.document_versions?.documents;
        console.log(`  ${i+1}. ${doc?.name || 'N/A'}`);
        console.log(`     Domain: ${doc?.domain}, Subdomain: ${doc?.subdomain}`);
      });
    } else {
      console.log('⚠️  Nenhum resultado encontrado!');
      console.log('\nPossíveis causas:');
      console.log('  1. Os embeddings não estão linkados corretamente');
      console.log('  2. O domain/subdomain não correspondem');
      console.log('  3. O status não é ACTIVE');
    }

  } catch (error) {
    console.error(`\n❌ Exceção: ${error}\n`);
  }
}

testarQueryManual().then(() => process.exit(0));
