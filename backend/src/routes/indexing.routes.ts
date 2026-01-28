/**
 * Indexing Routes - FASE 2
 * 
 * Endpoints para gerenciamento de indexação de embeddings
 * - Forçar indexação de documento
 * - Processar pendentes em batch
 * - Consultar status de indexação
 * - Estatísticas gerais
 */

import { Router, Request, Response } from 'express';
import { authGuard } from '../middlewares/authGuard';
import indexingService from '../services/indexing.service';

// ==========================================
// ROUTER INSTANCE
// ==========================================

const router = Router();

// ==========================================
// GUARDS CUSTOMIZADOS
// ==========================================

/**
 * Guard SOMENTE para TI
 * Indexação forçada e batch são operações administrativas
 */
const tiOnlyGuard = (req: any, res: Response, next: any) => {
  const userRole = req.user?.role?.toUpperCase();
  
  if (userRole === 'TI' || userRole === 'SECRETARIA') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Somente TI pode realizar esta ação.'
  });
};

// ==========================================
// ENDPOINTS
// ==========================================

/**
 * POST /api/indexing/version/:id
 * Forçar indexação de uma versão específica
 * Acesso: TI apenas
 */
router.post('/version/:id', authGuard, tiOnlyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID da versão é obrigatório'
      });
    }

    console.log(`[IndexingRoutes] Forçando indexação da versão: ${id}`);

    const result = await indexingService.indexVersion(id);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Indexação concluída com sucesso',
        data: {
          version_id: result.version_id,
          document_id: result.document_id,
          chunks_indexed: result.chunks_indexed,
          total_tokens: result.total_tokens,
          total_cost: result.total_cost,
          duration_ms: result.duration_ms
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Falha na indexação',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('[IndexingRoutes] Erro ao forçar indexação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao forçar indexação',
      error: error.message
    });
  }
});

/**
 * POST /api/indexing/process-pending
 * Processar todas as versões pendentes em batch
 * Acesso: TI apenas
 */
router.post('/process-pending', authGuard, tiOnlyGuard, async (_req: Request, res: Response) => {
  try {
    console.log('[IndexingRoutes] Processando versões pendentes...');

    const results = await indexingService.processPendingVersions();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTokens = results.reduce((sum, r) => sum + r.total_tokens, 0);
    const totalCost = results.reduce((sum, r) => sum + r.total_cost, 0);

    return res.status(200).json({
      success: true,
      message: `Processamento concluído: ${successful} sucesso, ${failed} falhas`,
      data: {
        total_processed: results.length,
        successful,
        failed,
        total_tokens: totalTokens,
        total_cost: totalCost,
        results: results.map(r => ({
          version_id: r.version_id,
          document_id: r.document_id,
          success: r.success,
          chunks_indexed: r.chunks_indexed,
          error: r.error
        }))
      }
    });

  } catch (error: any) {
    console.error('[IndexingRoutes] Erro ao processar pendentes:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar versões pendentes',
      error: error.message
    });
  }
});

/**
 * GET /api/indexing/document/:id/status
 * Consultar status de indexação de um documento
 * Acesso: Todos autenticados
 */
router.get('/document/:id/status', authGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do documento é obrigatório'
      });
    }

    const status = await indexingService.getDocumentIndexingStatus(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Documento não encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        document_id: status.document_id,
        document_name: status.document_name,
        document_type: status.document_type,
        document_status: status.document_status,
        prepared: status.prepared,
        indexed: status.indexed,
        indexing_status: status.indexing_status,
        total_chunks: status.total_chunks,
        indexed_chunks: status.indexed_chunks,
        total_tokens_used: status.total_tokens_used,
        last_indexed_at: status.last_indexed_at
      }
    });

  } catch (error: any) {
    console.error('[IndexingRoutes] Erro ao consultar status:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar status',
      error: error.message
    });
  }
});

/**
 * GET /api/indexing/stats
 * Consultar estatísticas gerais de indexação
 * Acesso: Todos autenticados
 */
router.get('/stats', authGuard, async (_req: Request, res: Response) => {
  try {
    const stats = await indexingService.getIndexingStats();

    return res.status(200).json({
      success: true,
      data: {
        total_documents: stats.total_documents,
        indexed_documents: stats.indexed_documents,
        pending_documents: stats.pending_documents,
        total_chunks: stats.total_chunks,
        indexed_chunks: stats.indexed_chunks,
        total_tokens: stats.total_tokens,
        total_cost: stats.total_cost,
        indexing_progress: stats.total_chunks > 0 
          ? ((stats.indexed_chunks / stats.total_chunks) * 100).toFixed(2) + '%'
          : '0%'
      }
    });

  } catch (error: any) {
    console.error('[IndexingRoutes] Erro ao consultar estatísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar estatísticas',
      error: error.message
    });
  }
});

export default router;
