/**
 * Script para restaurar o extracted_text e triggerar reprocessamento
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const DOCUMENT_ID = '7d2dc30d-e73f-489c-9390-f94bc458915d';
const VERSION_ID = '029e0949-29be-4121-9e1e-5c4eee18b822';

async function restaurarEReprocessar() {
  try {
    console.log('🔄 Restaurando extracted_text do arquivo original...');
    
    // Buscar documento para pegar o caminho do arquivo
    const { data: doc } = await supabase
      .from('documents')
      .select('*, document_versions(*)')
      .eq('id', DOCUMENT_ID)
      .single();
    
    if (!doc) {
      console.error('❌ Documento não encontrado');
      return;
    }
    
    // O arquivo foi processado anteriormente, vamos buscar de uma versão COMPLETED anterior
    // ou reprocessar do zero
    console.log('📄 Buscando versão anterior com texto extraído...');
    
    const { data: versions } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', DOCUMENT_ID)
      .order('version_number', { ascending: false });
    
    // Procurar versão com extracted_text
    const versionWithText = versions?.find(v => v.extracted_text && v.extracted_text.length > 0);
    
    if (!versionWithText) {
      console.log('⚠️  Nenhuma versão anterior com texto encontrada');
      console.log('   O arquivo original precisa ser reprocessado do zero.');
      console.log('');
      console.log('🎯 SOLUÇÃO: Desative e reative o documento no frontend');
      console.log('   Isso vai criar uma nova versão e reprocessar o CSV do zero');
      return;
    }
    
    console.log('✅ Texto encontrado na versão:', versionWithText.version_number);
    console.log(`   Tamanho: ${versionWithText.extracted_text.length} caracteres`);
    
    // Copiar extracted_text para a versão atual
    console.log('🔄 Copiando texto extraído...');
    const { error: updateError } = await supabase
      .from('document_versions')
      .update({
        extracted_text: versionWithText.extracted_text,
        raw_text: versionWithText.raw_text,
        status: 'PROCESSING',
        completed_at: null
      })
      .eq('id', VERSION_ID);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError);
      return;
    }
    
    console.log('✅ Texto restaurado!');
    console.log('');
    console.log('🎯 PRÓXIMO PASSO: Ativar o documento no frontend');
    console.log('   Acesse: http://localhost:5173');
    console.log('   Navegue até "Base de Conhecimento"');
    console.log('   Encontre "Quantidade de Funcionários por Cargo 2026"');
    console.log('   Clique em "Ativar"');
    console.log('   Isso criará um job que processará o documento com a nova config (maxSize: 300)');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

restaurarEReprocessar();
