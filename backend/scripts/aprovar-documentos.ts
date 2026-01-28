/**
 * Script para aprovar todos os documentos PENDING em massa
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function aprovarDocumentos() {
  try {
    console.log('🔍 Buscando documentos PENDING...\n');
    
    // Buscar documentos pendentes do domínio DIARIO_OFICIAL
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, name, status, domain, subdomain')
      .eq('status', 'PENDING')
      .eq('domain', 'DIARIO_OFICIAL');

    if (fetchError) {
      console.error('❌ Erro ao buscar documentos:', fetchError);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('✅ Nenhum documento pendente encontrado.');
      return;
    }

    console.log(`📋 Encontrados ${documents.length} documentos pendentes\n`);
    console.log('═'.repeat(60));
    
    let aprovados = 0;
    let erros = 0;

    // Aprovar cada documento
    for (const doc of documents) {
      console.log(`[${aprovados + erros + 1}/${documents.length}] ${doc.name}`);
      
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          status: 'ACTIVE',
          is_public: true
        })
        .eq('id', doc.id);

      if (updateError) {
        console.log(`   ❌ Erro: ${updateError.message}`);
        erros++;
      } else {
        console.log(`   ✅ Aprovado!`);
        aprovados++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('═'.repeat(60));
    console.log(`✅ Aprovados: ${aprovados}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📁 Total: ${documents.length}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

aprovarDocumentos();
