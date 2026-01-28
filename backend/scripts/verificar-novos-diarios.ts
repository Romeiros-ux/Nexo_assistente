/**
 * Script para verificar novos diários oficiais e executar manutenção automática
 * 
 * Este script deve ser executado periodicamente (ex: diariamente via cron)
 * Ele verifica:
 * 1. Se há novos PDFs na pasta downloads/
 * 2. Faz upload automático dos novos PDFs
 * 3. Executa manutenção para manter apenas os N mais recentes
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const DOWNLOADS_PATH = path.resolve(__dirname, 'downloads');
const CACHE_FILE = path.resolve(__dirname, '.uploaded-files.json');
const MANTER_ULTIMOS = 10; // Manter os 10 PDFs mais recentes

interface CacheData {
  uploadedFiles: string[];
  lastCheck: string;
}

/**
 * Carrega cache de arquivos já enviados
 */
function carregarCache(): CacheData {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️  Erro ao carregar cache, criando novo');
  }
  
  return {
    uploadedFiles: [],
    lastCheck: new Date().toISOString()
  };
}

/**
 * Salva cache de arquivos enviados
 */
function salvarCache(cache: CacheData) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Verifica se há novos PDFs na pasta downloads
 */
function verificarNovosPDFs(cache: CacheData): string[] {
  if (!fs.existsSync(DOWNLOADS_PATH)) {
    console.log('⚠️  Pasta downloads/ não encontrada');
    return [];
  }

  const files = fs.readdirSync(DOWNLOADS_PATH)
    .filter(f => f.endsWith('.pdf') && f.startsWith('D.O.S.'));

  const novos = files.filter(f => !cache.uploadedFiles.includes(f));
  
  return novos;
}

/**
 * Arquiva documentos antigos mantendo apenas os N mais recentes
 */
async function arquivarAntigos() {
  console.log('\n🔄 Executando manutenção...\n');

  const { data: documentos, error } = await supabase
    .from('documents')
    .select('id, name, uploaded_at, status')
    .eq('domain', 'DIARIO_OFICIAL')
    .eq('subdomain', 'TEXTOS_COMPLETOS')
    .eq('status', 'ACTIVE')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    return;
  }

  if (!documentos || documentos.length <= MANTER_ULTIMOS) {
    console.log(`✅ Total de ${documentos?.length || 0} documentos, dentro do limite de ${MANTER_ULTIMOS}`);
    return;
  }

  const processar = documentos.slice(MANTER_ULTIMOS);
  console.log(`📦 Arquivando ${processar.length} documentos antigos...\n`);

  let arquivados = 0;
  for (const doc of processar) {
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: 'ARCHIVED',
        is_public: false
      })
      .eq('id', doc.id);

    if (!updateError) {
      console.log(`✅ Arquivado: ${doc.name}`);
      arquivados++;
    } else {
      console.log(`❌ Erro ao arquivar ${doc.name}: ${updateError.message}`);
    }
  }

  console.log(`\n📊 Total arquivado: ${arquivados} documentos`);
}

/**
 * Função principal
 */
async function verificarEAtualizar() {
  console.log('🤖 VERIFICAÇÃO AUTOMÁTICA DE NOVOS DIÁRIOS OFICIAIS');
  console.log('═'.repeat(60));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log('═'.repeat(60));
  console.log('');

  // 1. Carregar cache
  const cache = carregarCache();
  console.log(`📋 Último check: ${new Date(cache.lastCheck).toLocaleString('pt-BR')}`);
  console.log(`📁 Arquivos já enviados: ${cache.uploadedFiles.length}\n`);

  // 2. Verificar novos arquivos
  console.log('🔍 Verificando novos PDFs...\n');
  const novosPDFs = verificarNovosPDFs(cache);

  if (novosPDFs.length === 0) {
    console.log('✅ Nenhum arquivo novo encontrado');
  } else {
    console.log(`🆕 Encontrados ${novosPDFs.length} novos PDFs:`);
    novosPDFs.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f}`);
    });
    console.log('');
    console.log('💡 Para fazer upload dos novos arquivos, execute:');
    console.log('   npx tsx upload-diarios-oficiais.ts');
    console.log('');
    console.log('   Depois execute novamente este script para arquivar os antigos.');
    console.log('');
  }

  // 3. Executar manutenção (arquivar antigos)
  await arquivarAntigos();

  // 4. Atualizar cache
  cache.lastCheck = new Date().toISOString();
  salvarCache(cache);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Verificação concluída');
  console.log('═'.repeat(60));
  console.log('\n💡 Dica: Configure este script para rodar automaticamente:');
  console.log('   • Linux/Mac: Adicione ao crontab');
  console.log('   • Windows: Use Agendador de Tarefas');
  console.log('   • Docker: Use cron container\n');
}

// Executar
verificarEAtualizar();
