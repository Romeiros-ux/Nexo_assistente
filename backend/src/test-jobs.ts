/**
 * Script de Teste - Sistema de Background Jobs
 * 
 * Testa o sistema completo de jobs assíncronos:
 * 1. Adiciona documento na fila
 * 2. Monitora processamento
 * 3. Verifica resultado
 */

import { config } from 'dotenv';

// Carrega variáveis de ambiente ANTES de importar outros módulos
config();

import indexingQueue from './queues/indexing.queue';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBackgroundJobs() {
  try {
    console.log('🧪 Iniciando teste do sistema de background jobs...\n');

    // 1. Buscar um documento para testar
    console.log('📄 Buscando documentos disponíveis...');
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, name, status')
      .eq('status', 'ACTIVE')
      .limit(1);

    if (docError) {
      console.error('❌ Erro ao buscar documentos:', docError);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️  Nenhum documento ativo encontrado no sistema.');
      console.log('   Para testar, faça upload de um documento pela interface.\n');
      return;
    }

    const document = documents[0];
    console.log(`✅ Documento encontrado: ${document.name} (ID: ${document.id})\n`);

    // 2. Adicionar job na fila
    console.log('➕ Adicionando documento na fila de indexação...');
    const jobId = await indexingQueue.addDocument(document.id, document.name);
    console.log(`✅ Job criado com ID: ${jobId}\n`);

    // 3. Aguardar um pouco para o processamento começar
    console.log('⏳ Aguardando processamento (5 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Verificar status do job
    console.log('📊 Verificando status do job...');
    const jobStatus = await indexingQueue.getJobStatus(jobId);
    console.log('Status do job:', JSON.stringify(jobStatus, null, 2));
    console.log('');

    // 5. Obter estatísticas da fila
    console.log('📈 Estatísticas da fila:');
    const stats = await indexingQueue.getStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // 6. Verificar job no banco de dados
    console.log('💾 Verificando registro no banco de dados...');
    const { data: dbJob, error: jobError } = await supabase
      .from('document_indexing_jobs')
      .select('*')
      .eq('bull_job_id', jobId)
      .single();

    if (jobError) {
      console.error('❌ Erro ao buscar job no banco:', jobError);
    } else {
      console.log('Job no banco de dados:');
      console.log(`  - Status: ${dbJob.status}`);
      console.log(`  - Chunks: ${dbJob.chunks_generated}`);
      console.log(`  - Embeddings: ${dbJob.embeddings_generated}`);
      console.log(`  - Tokens: ${dbJob.tokens_used}`);
      console.log(`  - Custo: $${dbJob.total_cost_usd}`);
      console.log(`  - Tentativas: ${dbJob.retry_count}/${dbJob.max_retries}`);
      console.log('');
    }

    // 7. Verificar estatísticas agregadas
    console.log('📊 Estatísticas agregadas (view v_indexing_jobs_stats):');
    const { data: statsData, error: statsError } = await supabase
      .from('v_indexing_jobs_stats')
      .select('*')
      .single();

    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
    } else {
      console.log(`  - Total de jobs: ${statsData.total_jobs}`);
      console.log(`  - Pendentes: ${statsData.jobs_pending}`);
      console.log(`  - Em progresso: ${statsData.jobs_in_progress}`);
      console.log(`  - Completos: ${statsData.jobs_completed}`);
      console.log(`  - Falhados: ${statsData.jobs_failed}`);
      console.log(`  - Taxa de sucesso: ${statsData.success_rate_percent}%`);
      console.log('');
    }

    console.log('✅ Teste concluído!\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Acesse http://127.0.0.1:3001/api/v1/jobs/stats para ver estatísticas');
    console.log('   2. Acesse http://127.0.0.1:3001/api/v1/jobs/recent para ver jobs recentes');
    console.log(`   3. Acesse http://127.0.0.1:3001/api/v1/jobs/${jobId} para ver este job\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executar teste
testBackgroundJobs();
