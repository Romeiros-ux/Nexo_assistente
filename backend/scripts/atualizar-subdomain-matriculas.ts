/**
 * Script para atualizar subdomain do documento "matricula e cargo dos funcionários" 
 * de SERVIDORES para MATRICULAS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDocumentSubdomain() {
  console.log('🔄 Atualizando subdomain do documento "matricula e cargo dos funcionários"...\n');

  try {
    // 1. Buscar o documento pelo nome
    const { data: documents, error: searchError } = await supabase
      .from('documents')
      .select('id, name, subdomain, domain')
      .ilike('name', '%matricula e cargo%');

    if (searchError) {
      throw new Error(`Erro ao buscar documento: ${searchError.message}`);
    }

    if (!documents || documents.length === 0) {
      console.log('❌ Documento não encontrado');
      return;
    }

    const doc = documents[0];
    console.log('📄 Documento encontrado:');
    console.log(`   ID:        ${doc.id}`);
    console.log(`   Nome:      ${doc.name}`);
    console.log(`   Domain:    ${doc.domain}`);
    console.log(`   Subdomain: ${doc.subdomain} → MATRICULAS`);
    console.log('');

    // 2. Atualizar subdomain
    const { error: updateError } = await supabase
      .from('documents')
      .update({ subdomain: 'MATRICULAS' })
      .eq('id', doc.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    console.log('✅ Subdomain atualizado com sucesso!');
    console.log('');
    console.log('📊 Agora o roteamento inteligente vai funcionar:');
    console.log('   - "Qual o nome do prefeito?" → busca em MATRICULAS');
    console.log('   - "Qual a matrícula de X?" → busca em MATRICULAS');
    console.log('   - Chunks menores e mais rápidos (4 colunas vs 14 colunas)');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

updateDocumentSubdomain();
