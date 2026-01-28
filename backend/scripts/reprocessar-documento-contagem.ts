/**
 * Script para reprocessar o documento de contagem
 * Deleta chunks antigos e recria com a nova configuração (maxSize: 300)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function reprocessar() {
  try {
    console.log('🔍 Buscando documento "Quantidade de Funcionários por Cargo 2026"...');
    
    // Buscar documento
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('id, name, domain, subdomain')
      .ilike('name', '%Quantidade de Funcionários por Cargo%')
      .single();

    if (docError || !docs) {
      console.error('❌ Documento não encontrado:', docError);
      return;
    }

    console.log('✅ Documento encontrado:', docs);

    // Buscar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('id, version_number, status')
      .eq('document_id', docs.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (versionError || !version) {
      console.error('❌ Versão não encontrada:', versionError);
      return;
    }

    console.log('✅ Versão encontrada:', version);

    // Deletar chunks antigos
    console.log('🗑️  Deletando chunks antigos...');
    const { error: deleteChunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_version_id', version.id);

    if (deleteChunksError) {
      console.error('❌ Erro ao deletar chunks:', deleteChunksError);
      return;
    }

    console.log('✅ Chunks deletados com sucesso');

    // Atualizar status da versão para PROCESSING (vai reprocessar)
    console.log('🔄 Marcando versão como PROCESSING para reprocessamento...');
    const { error: updateError } = await supabase
      .from('document_versions')
      .update({ 
        status: 'PROCESSING',
        completed_at: null
      })
      .eq('id', version.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar versão:', updateError);
      return;
    }

    console.log('✅ Versão marcada para reprocessamento');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Desative e reative o documento no frontend');
    console.log('2. Ou aguarde o job automático reprocessar');
    console.log('');
    console.log(`📊 Document ID: ${docs.id}`);
    console.log(`📊 Version ID: ${version.id}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

reprocessar();
