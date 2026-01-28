/**
 * Script para forçar reindexação do Cadastro de Trabalhadores
 * Processa todos os 6.616 chunks (não apenas 1.000)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reindexarCadastro() {
  console.log('🔄 Forçando reindexação do Cadastro de Trabalhadores...\n');

  try {
    // 1. Buscar documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, name')
      .ilike('name', '%Cadastro de Trabalhadores%')
      .single();

    if (docError || !doc) {
      console.error('❌ Documento não encontrado:', docError);
      return;
    }

    console.log('📄 Documento:', doc.name);

    // 2. Buscar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .single();

    if (versionError || !version) {
      console.error('❌ Versão não encontrada:', versionError);
      return;
    }

    console.log('📋 Versão:', version.id);

    // 3. Marcar versão como não indexada para forçar reindexação
    console.log('\n🔧 Marcando versão como não indexada...');
    const { error: updateError } = await supabase
      .from('document_versions')
      .update({ indexed: false })
      .eq('id', version.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar versão:', updateError);
      return;
    }

    console.log('✅ Versão marcada como não indexada');

    // 4. Chamar API de reindexação
    console.log('\n🚀 Iniciando reindexação via IndexingService...\n');
    console.log('⏳ Aguarde... Isso pode levar ~6-8 minutos para 6.616 chunks');
    console.log('💰 Custo estimado: ~$0.10 USD\n');

    // Importar serviço diretamente
    const indexingService = require('../dist/services/indexing.service').default;
    
    const result = await indexingService.indexVersion(version.id);

    if (result.success) {
      console.log('\n✅ REINDEXAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Chunks indexados: ${result.chunks_indexed}`);
      console.log(`Tokens usados: ${result.total_tokens}`);
      console.log(`Custo total: $${result.total_cost.toFixed(6)}`);
      console.log(`Duração: ${(result.duration_ms / 1000).toFixed(1)} segundos`);
      console.log('═══════════════════════════════════════════════════════');
    } else {
      console.error('\n❌ REINDEXAÇÃO FALHOU:', result.error);
    }

  } catch (error: any) {
    console.error('\n❌ Erro na reindexação:', error.message);
  }
}

reindexarCadastro()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
