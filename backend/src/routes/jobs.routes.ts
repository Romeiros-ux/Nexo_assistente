/**
 * Jobs Routes
 * 
 * Rotas para monitoramento e gerenciamento de jobs de indexação
 */

import { Router } from 'express';
import {
  getQueueStats,
  getRecentJobs,
  getFailedJobs,
  getJobStatus,
  retryJob,
  pauseQueue,
  resumeQueue,
  cleanOldJobs
} from '../controllers/jobs.controller';

const router = Router();

// ==========================================
// MONITORAMENTO
// ==========================================

/**
 * GET /api/v1/jobs/stats
 * Estatísticas gerais da fila e do banco de dados
 */
router.get('/stats', getQueueStats);

/**
 * GET /api/v1/jobs/recent
 * Lista jobs recentes (com paginação)
 * Query params: ?limit=20&offset=0
 */
router.get('/recent', getRecentJobs);

/**
 * GET /api/v1/jobs/failed
 * Lista jobs que falharam e podem ser retentados
 */
router.get('/failed', getFailedJobs);

/**
 * GET /api/v1/jobs/:jobId
 * Detalhes de um job específico (Bull + Database)
 */
router.get('/:jobId', getJobStatus);

// ==========================================
// GERENCIAMENTO
// ==========================================

/**
 * POST /api/v1/jobs/:jobId/retry
 * Retenta um job que falhou
 */
router.post('/:jobId/retry', retryJob);

/**
 * POST /api/v1/jobs/pause
 * Pausa o processamento da fila
 */
router.post('/pause', pauseQueue);

/**
 * POST /api/v1/jobs/resume
 * Retoma o processamento da fila
 */
router.post('/resume', resumeQueue);

/**
 * DELETE /api/v1/jobs/clean
 * Remove jobs antigos
 * Query params: ?days=7 (default: 7 dias)
 */
router.delete('/clean', cleanOldJobs);

export default router;
