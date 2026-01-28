/**
 * Script de manutenção para manter apenas os Diários Oficiais mais recentes
 * 
 * Este script:
 * 1. Busca todos os documentos do domínio DIARIO_OFICIAL/TEXTOS_COMPLETOS
 * 2. Mantém apenas os N mais recentes (configurável)
 * 3. Arquiva/exclui os documentos mais antigos
 * 
 * Executar periodicamente (ex: semanalmente via cron)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Configuração: quantos documentos manter
const MANTER_ULTIMOS = 10; // Manter os 10 PDFs mais recentes
const ACAO = 'ARQUIVAR'; // 'ARQUIVAR' ou 'EXCLUIR'

interface Documento {
  id: string;
  name: string;
  uploaded_at: string;
  status: string;
  file_url: string;
}

async function manterDiariosRecentes() {
  try {
    console.log('🔍 MANUTENÇÃO DE DIÁRIOS OFICIAIS');
    console.log('═'.repeat(60));
    console.log(`📋 Configuração:`);
    console.log(`   • Manter: ${MANTER_ULTIMOS} documentos mais recentes`);
    console.log(`   • Ação para antigos: ${ACAO}`);
    console.log('');

    // 1. Buscar todos os documentos do subdomínio TEXTOS_COMPLETOS
    console.log('📂 Buscando documentos de TEXTOS_COMPLETOS...\n');
    
    const { data: documentos, error: fetchError } = await supabase
      .from('documents')
      .select('id, name, uploaded_at, status, file_url')
      .eq('domain', 'DIARIO_OFICIAL')
      .eq('subdomain', 'TEXTOS_COMPLETOS')
      .eq('status', 'ACTIVE')
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Erro ao buscar documentos:', fetchError);
      return;
    }

    if (!documentos || documentos.length === 0) {
      console.log('✅ Nenhum documento encontrado.');
      return;
    }

    console.log(`📊 Encontrados ${documentos.length} documentos ACTIVE\n`);

    // 2. Separar em manter e processar
    const manter = documentos.slice(0, MANTER_ULTIMOS);
    const processar = documentos.slice(MANTER_ULTIMOS);

    console.log('═'.repeat(60));
    console.log('✅ DOCUMENTOS A MANTER (mais recentes):');
    console.log('═'.repeat(60));
    manter.forEach((doc, i) => {
      const data = new Date(doc.uploaded_at).toLocaleDateString('pt-BR');
      console.log(`${i + 1}. ${doc.name}`);
      console.log(`   📅 ${data}`);
    });

    if (processar.length === 0) {
      console.log('\n✅ Todos os documentos estão dentro do limite. Nada a fazer.');
      return;
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`⚠️  DOCUMENTOS A ${ACAO} (${processar.length} mais antigos):`);
    console.log('═'.repeat(60));
    processar.forEach((doc, i) => {
      const data = new Date(doc.uploaded_at).toLocaleDateString('pt-BR');
      console.log(`${i + 1}. ${doc.name}`);
      console.log(`   📅 ${data}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log(`🔄 Processando ${processar.length} documentos...`);
    console.log('═'.repeat(60));
    console.log('');

    let sucessos = 0;
    let erros = 0;

    // 3. Processar cada documento
    for (const doc of processar) {
      console.log(`[${sucessos + erros + 1}/${processar.length}] ${doc.name}`);

      if (ACAO === 'ARQUIVAR') {
        // Arquivar: mudar status para ARCHIVED
        const { error: updateError } = await supabase
          .from('documents')
          .update({ 
            status: 'ARCHIVED',
            is_public: false
          })
          .eq('id', doc.id);

        if (updateError) {
          console.log(`   ❌ Erro ao arquivar: ${updateError.message}`);
          erros++;
        } else {
          console.log(`   ✅ Arquivado com sucesso`);
          sucessos++;
        }

      } else if (ACAO === 'EXCLUIR') {
        // Excluir: remover do banco (chunks serão excluídos em cascata)
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);

        if (deleteError) {
          console.log(`   ❌ Erro ao excluir: ${deleteError.message}`);
          erros++;
        } else {
          console.log(`   ✅ Excluído com sucesso`);
          sucessos++;
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('═'.repeat(60));
    console.log(`✅ Mantidos: ${manter.length} documentos`);
    console.log(`${ACAO === 'ARQUIVAR' ? '📦' : '🗑️'} ${ACAO}dos: ${sucessos} documentos`);
    if (erros > 0) {
      console.log(`❌ Erros: ${erros} documentos`);
    }
    console.log(`📁 Total: ${documentos.length} documentos`);
    console.log('═'.repeat(60));

    // 4. Mostrar resumo do estado final
    const { data: finais, error: finalError } = await supabase
      .from('documents')
      .select('status')
      .eq('domain', 'DIARIO_OFICIAL')
      .eq('subdomain', 'TEXTOS_COMPLETOS');

    if (!finalError && finais) {
      const statusCount = finais.reduce((acc: any, doc: any) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Estado atual do subdomínio TEXTOS_COMPLETOS:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
manterDiariosRecentes();
