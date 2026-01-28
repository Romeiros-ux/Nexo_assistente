/**
 * FASE 2.5 - Indexing Queue Service
 * 
 * Responsável por gerenciar a fila de indexação assíncrona
 * - Adicionar documentos na fila (enqueue)
 * - Configurar retry automático
 * - Monitorar status dos jobs
 * - Integração com Bull/BullMQ
 */

import Bull, { Queue, Job } from 'bull';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// ===================================
// INTERFACES
// ===================================

export interface IndexingJobData {
  document_id: string;
  document_name: string;
  db_job_id?: string; // UUID do document_indexing_jobs
}

export interface IndexingJobResult {
  success: boolean;
  document_id: string;
  chunks_generated: number;
  embeddings_generated: number;
  tokens_used: number;
  total_cost: number;
  duration_ms: number;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// ===================================
// CONFIGURAÇÃO
// ===================================

// Suporta REDIS_URL (Upstash/Heroku) ou variáveis separadas (local)
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// ===================================
// INDEXING QUEUE SERVICE
// ===================================

class IndexingQueueService {
  private queue: Queue<IndexingJobData> | null = null;
  private redisClient: Redis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    try {
      // Configurar Redis client
      // Suporta REDIS_URL (Upstash, Heroku) ou variáveis separadas (local)
      if (REDIS_URL) {
        console.log('[IndexingQueue] Usando REDIS_URL:', REDIS_URL.replace(/:[^:@]+@/, ':***@'));
        
        this.redisClient = new Redis(REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          retryStrategy: () => null,
          tls: REDIS_URL.startsWith('rediss://') ? {
            rejectUnauthorized: false,
            requestCert: true,
            minVersion: 'TLSv1.2'
          } : undefined,
        });
      } else {
        console.log('[IndexingQueue] Usando variáveis separadas:', {
          host: REDIS_HOST,
          port: REDIS_PORT,
          db: REDIS_DB,
        });
        
        this.redisClient = new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
          db: REDIS_DB,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          retryStrategy: () => null,
        });
      }

      // Tentar conectar
      this.redisClient.connect().then(() => {
        // Configurar fila Bull com URL ou config separada
        if (REDIS_URL) {
          this.queue = new Bull<IndexingJobData>('document-indexing', REDIS_URL, {
            redis: {
              tls: REDIS_URL.startsWith('rediss://') ? {
                rejectUnauthorized: false,
                requestCert: true,
                minVersion: 'TLSv1.2'
              } : undefined,
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: false,
              removeOnFail: false,
            },
          });
        } else {
          this.queue = new Bull<IndexingJobData>('document-indexing', {
            redis: {
              host: REDIS_HOST,
              port: REDIS_PORT,
              password: REDIS_PASSWORD,
              db: REDIS_DB,
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: false,
              removeOnFail: false,
            },
          });
        }

        this.setupEventHandlers();
        this.isEnabled = true;

        const logInfo = REDIS_URL 
          ? { redis_url: REDIS_URL.replace(/:[^:@]+@/, ':***@'), queue_name: 'document-indexing' }
          : { redis_host: REDIS_HOST, redis_port: REDIS_PORT, redis_db: REDIS_DB, queue_name: 'document-indexing' };
        
        console.log('[IndexingQueue] Inicializado:', logInfo);
      }).catch(() => {
        console.warn('[IndexingQueue] ⚠️ Redis não disponível - Fila de indexação desabilitada');
        console.warn('[IndexingQueue] Documentos serão indexados sincronamente');
        this.isEnabled = false;
        this.redisClient = null;
        this.queue = null;
      });

    } catch (error: any) {
      console.warn('[IndexingQueue] ⚠️ Erro ao inicializar Redis - Fila desabilitada:', error.message);
      this.isEnabled = false;
      this.redisClient = null;
      this.queue = null;
    }
  }

  /**
   * Configurar handlers de eventos da fila
   */
  private setupEventHandlers() {
    if (!this.queue) return;

    // Job adicionado
    this.queue.on('waiting', (jobId: string) => {
      console.log(`[IndexingQueue] Job ${jobId} adicionado à fila`);
    });

    // Job iniciado
    this.queue.on('active', (job: Job<IndexingJobData>) => {
      console.log(`[IndexingQueue] Job ${job.id} iniciado:`, job.data.document_name);
    });

    // Job completado
    this.queue.on('completed', async (job: Job<IndexingJobData>, result: IndexingJobResult) => {
      console.log(`[IndexingQueue] Job ${job.id} completado:`, {
        document: result.document_id,
        chunks: result.chunks_generated,
        embeddings: result.embeddings_generated,
        cost: `$${result.total_cost.toFixed(6)}`,
        duration: `${result.duration_ms}ms`,
      });

      // Atualizar status no banco
      if (job.data.db_job_id) {
        await this.updateJobStatus(job.data.db_job_id, 'COMPLETED', result);
      }
    });

    // Job falhou
    this.queue.on('failed', async (job: Job<IndexingJobData>, err: Error) => {
      console.error(`[IndexingQueue] Job ${job.id} falhou:`, {
        document: job.data.document_name,
        error: err.message,
        attempts: job.attemptsMade,
      });

      // Atualizar status no banco
      if (job.data.db_job_id) {
        const status = job.attemptsMade >= (job.opts.attempts || 3) 
          ? 'INDEXING_FAILED' 
          : 'NOT_STARTED';
        
        await this.updateJobStatus(job.data.db_job_id, status, { error: err.message });
        
        if (status === 'NOT_STARTED') {
          await this.incrementRetryCount(job.data.db_job_id);
        }
      }
    });

    // Erro na fila
    this.queue.on('error', (error: Error) => {
      console.error('[IndexingQueue] Erro na fila:', error.message);
    });
  }

  /**
   * Adicionar documento na fila para indexação
   */
  async addDocument(documentId: string, documentName: string): Promise<string> {
    // Se fila não está habilitada, retornar indicação de indexação síncrona
    if (!this.isEnabled || !this.queue) {
      console.warn('[IndexingQueue] Fila desabilitada - Indexação deve ser feita sincronamente');
      throw new Error('Queue not available - use synchronous indexing');
    }

    try {
      // 1. Criar registro no banco (document_indexing_jobs)
      const { data: dbJob, error: dbError } = await supabase
        .rpc('create_indexing_job', {
          p_document_id: documentId,
        })
        .single();

      if (dbError) {
        throw new Error(`Erro ao criar job no banco: ${dbError.message}`);
      }

      const dbJobId = dbJob as string;

      // 2. Adicionar job na fila Bull
      const job = await this.queue.add(
        {
          document_id: documentId,
          document_name: documentName,
          db_job_id: dbJobId,
        },
        {
          jobId: dbJobId, // Usar mesmo ID para correlação
          priority: 1, // Prioridade normal
        }
      );

      // 3. Atualizar bull_job_id no banco
      await supabase
        .from('document_indexing_jobs')
        .update({ bull_job_id: job.id?.toString() })
        .eq('id', dbJobId);

      console.log('[IndexingQueue] Documento adicionado à fila:', {
        document_id: documentId,
        document_name: documentName,
        job_id: job.id,
        db_job_id: dbJobId,
      });

      return dbJobId;
    } catch (error) {
      console.error('[IndexingQueue] Erro ao adicionar documento:', error);
      throw error;
    }
  }

  /**
   * Adicionar múltiplos documentos em batch
   */
  async addBatch(documents: Array<{ id: string; name: string }>): Promise<string[]> {
    const jobIds: string[] = [];

    for (const doc of documents) {
      try {
        const jobId = await this.addDocument(doc.id, doc.name);
        jobIds.push(jobId);
      } catch (error) {
        console.error(`[IndexingQueue] Erro ao adicionar ${doc.name}:`, error);
      }
    }

    console.log(`[IndexingQueue] Batch adicionado: ${jobIds.length}/${documents.length} documentos`);
    return jobIds;
  }

  /**
   * Obter status de um job específico
   */
  async getJobStatus(jobId: string): Promise<any> {
    if (!this.isEnabled || !this.queue) {
      return { found: false, error: 'Queue not available' };
    }

    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return { found: false };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      found: true,
      id: job.id,
      state,
      progress,
      data: job.data,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    };
  }

  /**
   * Obter estatísticas da fila
   */
  async getStats(): Promise<QueueStats> {
    if (!this.isEnabled || !this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: true,
      };
    }

    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Limpar jobs antigos (completed/failed)
   */
  async cleanOldJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000) {
    if (!this.queue) return;
    
    // Limpar jobs completados há mais de 7 dias
    await this.queue.clean(olderThanMs, 'completed');
    
    // Limpar jobs falhados há mais de 7 dias
    await this.queue.clean(olderThanMs, 'failed');

    console.log(`[IndexingQueue] Jobs antigos limpos (> ${olderThanMs}ms)`);
  }

  /**
   * Pausar fila (emergência)
   */
  async pause() {
    if (!this.queue) return;
    await this.queue.pause();
    console.log('[IndexingQueue] Fila pausada');
  }

  /**
   * Retomar fila
   */
  async resume() {
    if (!this.queue) return;
    await this.queue.resume();
    console.log('[IndexingQueue] Fila retomada');
  }

  /**
   * Remover job específico
   */
  async removeJob(jobId: string) {
    if (!this.queue) return;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[IndexingQueue] Job ${jobId} removido`);
    }
  }

  /**
   * Tentar novamente um job falhado
   */
  async retryJob(jobId: string) {
    if (!this.queue) return;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
      console.log(`[IndexingQueue] Job ${jobId} re-adicionado à fila`);
    }
  }

  /**
   * Obter referência à fila (para processor)
   */
  getQueue(): Queue<IndexingJobData> | null {
    return this.queue;
  }

  /**
   * Verificar se a fila está habilitada
   */
  isQueueEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Fechar conexões (graceful shutdown)
   */
  async close() {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
    console.log('[IndexingQueue] Conexões fechadas');
  }

  // ===================================
  // HELPERS PRIVADOS - SUPABASE
  // ===================================

  /**
   * Atualizar status do job no banco
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    result?: Partial<IndexingJobResult> & { error?: string }
  ) {
    try {
      await supabase.rpc('update_indexing_job_status', {
        p_job_id: jobId,
        p_status: status,
        p_chunks_generated: result?.chunks_generated || null,
        p_embeddings_generated: result?.embeddings_generated || null,
        p_tokens_used: result?.tokens_used || null,
        p_total_cost_usd: result?.total_cost || null,
        p_error_message: result?.error || null,
      });
    } catch (error) {
      console.error('[IndexingQueue] Erro ao atualizar status no banco:', error);
    }
  }

  /**
   * Incrementar contador de retry
   */
  private async incrementRetryCount(jobId: string) {
    try {
      await supabase.rpc('increment_job_retry', {
        p_job_id: jobId,
      });
    } catch (error) {
      console.error('[IndexingQueue] Erro ao incrementar retry:', error);
    }
  }
}

// ===================================
// SINGLETON EXPORT
// ===================================

const indexingQueue = new IndexingQueueService();

export default indexingQueue;
