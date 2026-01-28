/**
 * Search Routes - FASE 2
 * 
 * Endpoints para busca semântica em documentos
 * - Busca semântica com filtros
 * - Histórico de buscas
 * - Queries populares
 * - Estatísticas de uso
 */

import { Router, Request, Response } from 'express';
import { authGuard } from '../middlewares/authGuard';
import searchService, { SearchQuery } from '../services/search.service';

// ==========================================
// ROUTER INSTANCE
// ==========================================

const router = Router();

// ==========================================
// ENDPOINTS
// ==========================================

/**
 * POST /api/search/semantic
 * Realizar busca semântica
 * Acesso: Todos autenticados
 */
router.post('/semantic', authGuard, async (req: any, res: Response) => {
  try {
    const { query, filters } = req.body;

    // Validações
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Campo "query" é obrigatório e deve ser uma string'
      });
    }

    if (query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Query deve ter pelo menos 3 caracteres'
      });
    }

    // Extrair informações do usuário autenticado
    const userId = req.user?.id;
    const userProfile = req.user?.role?.toUpperCase() || 'DIRETOR';
    const unitId = req.user?.unit_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Montar query de busca
    const searchQuery: SearchQuery = {
      query: query.trim(),
      user_id: userId,
      user_profile: userProfile,
      unit_id: unitId,
      filters: filters || {}
    };

    console.log(`[SearchRoutes] Busca iniciada:`, {
      user_id: userId,
      profile: userProfile,
      query: query.substring(0, 50)
    });

    // Executar busca
    const result = await searchService.search(searchQuery);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          query: result.query,
          results: result.results,
          total_results: result.total_results,
          tokens_used: result.tokens_used,
          search_cost: result.search_cost,
          duration_ms: result.duration_ms,
          filters_applied: result.filters_applied
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Erro na busca',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('[SearchRoutes] Erro na busca semântica:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao realizar busca',
      error: error.message
    });
  }
});

/**
 * GET /api/search/history
 * Consultar histórico de buscas do usuário
 * Acesso: Próprio usuário
 */
router.get('/history', authGuard, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const history = await searchService.getSearchHistory(userId, limit);

    return res.status(200).json({
      success: true,
      data: {
        total: history.length,
        history: history.map(log => ({
          id: log.id,
          query: log.query,
          results_count: log.results_count,
          tokens_used: log.tokens_used,
          similarity_threshold: log.similarity_threshold,
          created_at: log.created_at
        }))
      }
    });

  } catch (error: any) {
    console.error('[SearchRoutes] Erro ao buscar histórico:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico',
      error: error.message
    });
  }
});

/**
 * GET /api/search/popular
 * Consultar queries mais buscadas
 * Acesso: TI apenas
 */
router.get('/popular', authGuard, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role?.toUpperCase();
    
    // Somente TI pode ver queries populares (análise de dados)
    if (userRole !== 'TI' && userRole !== 'SECRETARIA') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Somente TI pode acessar este recurso.'
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const popular = await searchService.getPopularQueries(limit);

    return res.status(200).json({
      success: true,
      data: {
        total: popular.length,
        queries: popular
      }
    });

  } catch (error: any) {
    console.error('[SearchRoutes] Erro ao buscar queries populares:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar queries populares',
      error: error.message
    });
  }
});

/**
 * GET /api/search/stats
 * Consultar estatísticas de uso de busca
 * Acesso: TI apenas
 */
router.get('/stats', authGuard, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role?.toUpperCase();
    
    // Somente TI pode ver estatísticas gerais
    if (userRole !== 'TI' && userRole !== 'SECRETARIA') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Somente TI pode acessar este recurso.'
      });
    }

    const stats = await searchService.getSearchStats();

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('[SearchRoutes] Erro ao buscar estatísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/search/document/:id/chunks
 * Obter todos os chunks de um documento
 * Acesso: Todos autenticados (com filtros de governança)
 */
router.get('/document/:id/chunks', authGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do documento é obrigatório'
      });
    }

    const result = await searchService.getDocumentChunks(id);

    return res.status(200).json({
      success: true,
      data: {
        document: result.document,
        chunks: result.chunks,
        total_chunks: result.chunks.length
      }
    });

  } catch (error: any) {
    console.error('[SearchRoutes] Erro ao buscar chunks:', error);
    
    if (error.message.includes('não encontrado') || error.message.includes('inativo')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar chunks',
      error: error.message
    });
  }
});

export default router;
