/**
 * FASE 2.5 - Indexing Job Processor
 * 
 * Worker que processa jobs de indexação em background
 * - Consome jobs da fila Bull
 * - Executa indexação (chunks + embeddings)
 * - Atualiza status no banco
 * - Trata erros e retry automático
 */

import { Job } from 'bull';
import { IndexingJobData, IndexingJobResult } from './indexing.queue';
import indexingService from '../services/indexing.service';
import documentPreparationService from '../services/documentPreparation.service';

// ===================================
// JOB PROCESSOR
// ===================================

/**
 * Função principal que processa cada job
 * Chamada automaticamente pelo Bull quando há jobs na fila
 */
export async function processIndexingJob(job: Job<IndexingJobData>): Promise<IndexingJobResult> {
  const startTime = Date.now();
  const { document_id, document_name } = job.data;

  console.log(`[IndexingProcessor] Iniciando job ${job.id}:`, {
    document_id,
    document_name,
    attempt: job.attemptsMade + 1,
    max_attempts: job.opts.attempts,
  });

  try {
    // 1. Atualizar progresso: 0%
    await job.progress(0);

    // 2. Processar versão existente (extrair texto + criar chunks)
    console.log(`[IndexingProcessor] Processando versão (extraindo texto + criando chunks)...`);
    await job.progress(10);
    
    const preparationResult = await documentPreparationService.processExistingVersion(document_id);
    
    if (!preparationResult.success) {
      throw new Error(preparationResult.error || 'Falha no processamento da versão');
    }
    
    console.log(`[IndexingProcessor] Versão processada:`, {
      version_id: preparationResult.version_id,
      chunks_count: preparationResult.chunks_count,
    });

    // 3. Buscar versão não indexada do documento
    await job.progress(30);
    const version = await findUnindexedVersion(document_id);

    if (!version) {
      throw new Error(`Nenhuma versão não-indexada encontrada para documento ${document_id}`);
    }

    console.log(`[IndexingProcessor] Versão encontrada:`, {
      version_id: version.id,
      version_number: version.version_number,
      status: version.status,
    });

    // 4. Executar indexação (gerar embeddings)
    await job.progress(50);
    const result = await indexingService.indexVersion(version.id);

    if (!result.success) {
      throw new Error(result.error || 'Falha na indexação');
    }

    console.log(`[IndexingProcessor] Indexação completa:`, {
      version_id: version.id,
      chunks_indexed: result.chunks_indexed,
      tokens: result.total_tokens,
      cost: `$${result.total_cost.toFixed(6)}`,
      duration: `${result.duration_ms}ms`,
    });

    // 5. Atualizar progresso: 100%
    await job.progress(100);

    // 6. Retornar resultado
    const duration = Date.now() - startTime;
    return {
      success: true,
      document_id,
      chunks_generated: result.chunks_indexed,
      embeddings_generated: result.chunks_indexed,
      tokens_used: result.total_tokens,
      total_cost: result.total_cost,
      duration_ms: duration,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error(`[IndexingProcessor] Erro no job ${job.id}:`, {
      document_id,
      error: error.message,
      attempt: job.attemptsMade + 1,
      duration: `${duration}ms`,
    });

    // Lançar erro para Bull gerenciar retry
    throw error;
  }
}

// ===================================
// HELPERS
// ===================================

/**
 * Buscar versão não-indexada de um documento
 */
async function findUnindexedVersion(documentId: string): Promise<any> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('document_versions')
    .select('id, version_number, status, indexed')
    .eq('document_id', documentId)
    .eq('status', 'COMPLETED')
    .eq('indexed', false)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhuma versão encontrada
      return null;
    }
    throw error;
  }

  return data;
}

// ===================================
// CONFIGURAÇÃO DO PROCESSOR
// ===================================

/**
 * Configurar e iniciar o processor
 * Deve ser chamado no server.ts ou worker separado
 */
export function startProcessor() {
  const indexingQueue = require('./indexing.queue').default;
  
  // Verificar se a fila está habilitada
  if (!indexingQueue.isQueueEnabled()) {
    console.warn('[IndexingProcessor] ⚠️ Fila não habilitada - Processor não será iniciado');
    console.warn('[IndexingProcessor] Redis não disponível ou falhou ao conectar');
    return;
  }

  const queue = indexingQueue.getQueue();
  
  if (!queue) {
    console.warn('[IndexingProcessor] ⚠️ Queue não disponível - Processor não será iniciado');
    return;
  }

  // Configurar processor
  queue.process(
    2, // Concorrência: processar 2 jobs simultaneamente
    processIndexingJob
  );

  console.log('[IndexingProcessor] Processor iniciado com concorrência: 2');

  // Handlers de eventos
  queue.on('global:completed', (jobId: string) => {
    console.log(`[IndexingProcessor] ✅ Job ${jobId} completado globalmente`);
  });

  queue.on('global:failed', (jobId: string, err: Error) => {
    console.error(`[IndexingProcessor] ❌ Job ${jobId} falhou globalmente:`, err.message);
  });

  queue.on('global:stalled', (jobId: string) => {
    console.warn(`[IndexingProcessor] ⚠️ Job ${jobId} travado (stalled)`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[IndexingProcessor] SIGTERM recebido, encerrando...');
    await queue.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[IndexingProcessor] SIGINT recebido, encerrando...');
    await queue.close();
    process.exit(0);
  });
}

// ===================================
// MONITORAMENTO E MÉTRICAS
// ===================================

/**
 * Obter métricas do processor (para dashboard)
 */
export async function getProcessorMetrics() {
  const indexingQueue = require('./indexing.queue').default;
  const stats = await indexingQueue.getStats();

  return {
    queue_stats: stats,
    processor: {
      concurrency: 2,
      active: stats.active > 0,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Health check do processor
 */
export async function healthCheck(): Promise<{ healthy: boolean; message: string }> {
  try {
    const indexingQueue = require('./indexing.queue').default;
    const stats = await indexingQueue.getStats();

    // Verificar se fila não está pausada
    if (stats.paused) {
      return {
        healthy: false,
        message: 'Fila está pausada',
      };
    }

    // Verificar se não há muitos jobs falhados
    const failRate = stats.failed / (stats.completed + stats.failed || 1);
    if (failRate > 0.5 && stats.failed > 10) {
      return {
        healthy: false,
        message: `Taxa de falha muito alta: ${(failRate * 100).toFixed(1)}%`,
      };
    }

    return {
      healthy: true,
      message: 'Processor funcionando normalmente',
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Erro ao verificar saúde: ${error.message}`,
    };
  }
}
