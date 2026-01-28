/**
 * Script para forçar reprocessamento criando uma nova versão PROCESSING
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const VERSION_ID = '029e0949-29be-4121-9e1e-5c4eee18b822';

async function forcarReprocessamento() {
  try {
    console.log('🔄 Forçando reprocessamento do documento...');
    console.log('');
    
    // Passo 1: Verificar versão
    const { data: version } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', VERSION_ID)
      .single();
    
    console.log('📄 Versão atual:', {
      id: version?.id,
      status: version?.status,
      extracted_text_length: version?.extracted_text?.length
    });
    
    // Passo 2: Verificar chunks
    const { count: chunksCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_version_id', VERSION_ID);
    
    console.log('📊 Chunks atuais:', chunksCount || 0);
    
    // Se não tem chunks, está pronto para reprocessar
    if (chunksCount === 0 && version?.status === 'PROCESSING' && version?.extracted_text) {
      console.log('');
      console.log('✅ Documento pronto para reprocessamento!');
      console.log('');
      console.log('🎯 PRÓXIMO PASSO:');
      console.log('   O backend deveria estar detectando versões PROCESSING e processando automaticamente.');
      console.log('   Verifique os logs do backend (terminal onde `npm run dev` está rodando).');
      console.log('');
      console.log('   Se não processar automaticamente, você pode:');
      console.log('   1. Ir no frontend (http://localhost:5173)');
      console.log('   2. Clicar em "Desativar" no documento "Quantidade de Funcionários por Cargo 2026"');
      console.log('   3. Clicar em "Ativar" novamente');
      console.log('   4. Isso criará um novo job e processará com a nova configuração (maxSize: 300)');
    } else {
      console.log('');
      console.log('⚠️  Estado inesperado:');
      console.log(`   - Chunks: ${chunksCount}`);
      console.log(`   - Status: ${version?.status}`);
      console.log(`   - Texto extraído: ${version?.extracted_text ? 'Sim' : 'Não'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error);
  }
}

forcarReprocessamento();
