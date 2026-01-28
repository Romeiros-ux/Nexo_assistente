/**
 * Jobs Controller
 * 
 * Controller para monitoramento e gerenciamento de jobs de indexação em background
 */

import { Request, Response } from 'express';
import indexingQueue from '../queues/indexing.queue';
import { supabase } from '../config/supabase';

/**
 * GET /api/v1/jobs/stats
 * Retorna estatísticas da fila de jobs
 */
export async function getQueueStats(_req: Request, res: Response) {
  try {
    const stats = await indexingQueue.getStats();
    
    // Buscar estatísticas do banco de dados
    const { data: dbStats, error } = await supabase
      .from('v_indexing_jobs_stats')
      .select('*')
      .single();

    if (error) {
      console.error('[JobsController] Erro ao buscar stats do DB:', error);
    }

    res.json({
      success: true,
      data: {
        queue: stats,
        database: dbStats || null
      }
    });
  } catch (error) {
    console.error('[JobsController] Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas dos jobs'
    });
  }
}

/**
 * GET /api/v1/jobs/recent
 * Lista jobs recentes (últimos 100)
 */
export async function getRecentJobs(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from('v_indexing_jobs_recent')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });
  } catch (error) {
    console.error('[JobsController] Erro ao buscar jobs recentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar jobs recentes'
    });
  }
}

/**
 * GET /api/v1/jobs/failed
 * Lista jobs que falharam e podem ser retentados
 */
export async function getFailedJobs(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('v_indexing_jobs_failed')
      .select('*');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[JobsController] Erro ao buscar jobs com falha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar jobs com falha'
    });
  }
}

/**
 * GET /api/v1/jobs/:jobId
 * Retorna detalhes de um job específico
 */
export async function getJobStatus(req: Request, res: Response) {
  try {
    const { jobId } = req.params;

    // Buscar status do Bull
    const bullStatus = await indexingQueue.getJobStatus(jobId);

    // Buscar dados do banco
    const { data: dbData, error } = await supabase
      .from('document_indexing_jobs')
      .select(`
        *,
        documents (
          id,
          name,
          document_type,
          status
        )
      `)
      .eq('bull_job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    res.json({
      success: true,
      data: {
        bull: bullStatus,
        database: dbData || null
      }
    });
  } catch (error) {
    console.error('[JobsController] Erro ao buscar status do job:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar status do job'
    });
  }
}

/**
 * POST /api/v1/jobs/:jobId/retry
 * Retenta um job que falhou
 */
export async function retryJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;

    const result = await indexingQueue.retryJob(jobId);

    if (result !== undefined) {
      res.json({
        success: true,
        message: 'Job adicionado para retry',
        data: { jobId }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Job não encontrado ou não pode ser retentado'
      });
    }
  } catch (error) {
    console.error('[JobsController] Erro ao retentar job:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao retentar job'
    });
  }
}

/**
 * POST /api/v1/jobs/pause
 * Pausa o processamento da fila
 */
export async function pauseQueue(_req: Request, res: Response) {
  try {
    await indexingQueue.pause();

    res.json({
      success: true,
      message: 'Fila pausada com sucesso'
    });
  } catch (error) {
    console.error('[JobsController] Erro ao pausar fila:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao pausar fila'
    });
  }
}

/**
 * POST /api/v1/jobs/resume
 * Retoma o processamento da fila
 */
export async function resumeQueue(_req: Request, res: Response) {
  try {
    await indexingQueue.resume();

    res.json({
      success: true,
      message: 'Fila retomada com sucesso'
    });
  } catch (error) {
    console.error('[JobsController] Erro ao retomar fila:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao retomar fila'
    });
  }
}

/**
 * DELETE /api/v1/jobs/clean
 * Remove jobs antigos (completed/failed > 7 dias)
 */
export async function cleanOldJobs(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const olderThanMs = days * 24 * 60 * 60 * 1000;

    const removed = await indexingQueue.cleanOldJobs(olderThanMs);

    res.json({
      success: true,
      message: `${removed} jobs removidos (mais antigos que ${days} dias)`,
      data: { removed, days }
    });
  } catch (error) {
    console.error('[JobsController] Erro ao limpar jobs antigos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar jobs antigos'
    });
  }
}
