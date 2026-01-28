import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente faltando');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function atualizarMetadados() {
  console.log('🏷️  Atualizando metadados do Cadastro de Trabalhadores...\n');

  try {
    // 1. Buscar o documento
    const { data: doc } = await supabase
      .from('documents')
      .select('id, name')
      .eq('name', 'Cadastro de Trabalhadores 2026')
      .single();

    if (!doc) {
      throw new Error('Documento não encontrado');
    }

    console.log(`📄 Documento: ${doc.name}`);
    console.log(`🆔 ID: ${doc.id}\n`);

    // 2. Buscar a versão
    const { data: version } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .single();

    if (!version) {
      throw new Error('Versão não encontrada');
    }

    console.log(`📋 Versão: ${version.id}\n`);

    // 3. Atualizar domain/subdomain do documento (colunas diretas)
    console.log('📝 Atualizando domain/subdomain do documento...');
    
    const { error: docUpdateError } = await supabase
      .from('documents')
      .update({
        domain: 'RECURSOS_HUMANOS',
        subdomain: 'SERVIDORES',
        metadata_year: 2026,
        keywords: ['funcionários', 'servidores', 'trabalhadores', 'cadastro', 'RH', 'recursos humanos']
      })
      .eq('id', doc.id);

    if (docUpdateError) {
      throw new Error(`Erro ao atualizar documento: ${docUpdateError.message}`);
    }

    console.log('✅ Domain/subdomain do documento atualizado\n');

    // 4. Contar chunks
    const { count } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_version_id', version.id);

    console.log(`📦 Total de chunks: ${count || 0}`);

    if (!count || count === 0) {
      console.log('⚠️  Nenhum chunk encontrado\n');
      return;
    }

    // 5. Atualizar chunks DIRETAMENTE por version_id (metadata JSONB - opcional)
    console.log('🔄 Atualizando metadados JSONB dos chunks...\n');

    const { error: updateError } = await supabase
      .from('document_chunks')
      .update({
        metadata: {
          source: 'Cadastro de Trabalhadores 2026',
          tipo: 'dados_tabulares'
        }
      })
      .eq('document_version_id', version.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar chunks: ${updateError.message}`);
    }

    console.log(`\n✅ Metadata JSONB dos chunks atualizado (opcional)!`);
    console.log(`\n📊 RESUMO:`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`   Domain:    RECURSOS_HUMANOS (tabela documents)`);
    console.log(`   Subdomain: SERVIDORES (tabela documents)`);
    console.log(`   Tipo:      DATA`);
    console.log(`   Ano:       2026`);
    console.log(`   Keywords:  funcionários, servidores, trabalhadores`);
    console.log(`   Chunks:    ${count} (metadata JSONB atualizado)`);
    console.log(`═══════════════════════════════════════════\n`);

    console.log('🎯 Agora as buscas devem funcionar corretamente!\n');

  } catch (error) {
    console.error(`\n❌ ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

atualizarMetadados()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
