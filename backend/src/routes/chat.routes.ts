/**
 * FASE 3 - Chat Routes
 * 
 * Endpoints para chat conversacional
 * - POST /api/chat/ask - Fazer pergunta
 * - GET /api/chat/history - Histórico pessoal
 * - GET /api/chat/stats - Estatísticas (TI apenas)
 * - GET /api/chat/conversations - Listar conversas
 * - GET /api/chat/conversations/:id/messages - Mensagens de uma conversa
 * - DELETE /api/chat/conversations/:id - Deletar conversa
 * 
 * Segurança:
 * - JWT obrigatório
 * - Perfis permitidos: DIRETOR, COMISSAO, SECRETARIA, TI
 * - RLS no banco para logs
 */

import { Router, Request, Response } from 'express';
import chatService, { ChatRequest } from '../services/chat.service';
import conversationService from '../services/conversation.service';
import { authGuard } from '../middlewares/authGuard';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// ===================================
// MIDDLEWARE: PERFIS PERMITIDOS
// ===================================

/**
 * Guard: Apenas perfis autorizados podem usar o chat
 * Permitidos: DIRETOR, COMISSAO, SECRETARIA, TI
 */
const chatAllowedGuard = async (req: Request, res: Response, next: Function) => {
  const userRole = (req as any).user?.role;

  const allowedProfiles = ['DIRETOR', 'COMISSAO', 'SECRETARIA', 'TI'];

  if (!allowedProfiles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado: Apenas Diretores, Comissão, Secretaria e TI podem usar o chat',
    });
  }

  return next();
};

/**
 * Guard: Apenas TI pode ver estatísticas globais
 */
const tiOnlyGuard = async (req: Request, res: Response, next: Function) => {
  const userProfile = (req as any).user?.profile;

  if (userProfile !== 'TI') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado: Apenas TI pode acessar estatísticas globais',
    });
  }

  return next();
};

// ===================================
// ROTAS
// ===================================

/**
 * POST /api/chat/ask
 * Fazer uma pergunta ao assistente
 * 
 * Body:
 * {
 *   "query": "Qual o prazo para matrícula escolar?",
 *   "filters": {
 *     "document_type": "REGIMENTO",  // opcional
 *     "max_results": 8                // opcional
 *   }
 * }
 */
router.post('/ask', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userProfile = (req as any).user?.role;
    const unitId = undefined; // TI não tem unidade específica
    const unitName = undefined;

    const { query, filters, conversationId } = req.body; // NOVO: conversationId

    // Validação básica
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Campo "query" é obrigatório',
      });
    }

    if (query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Pergunta muito curta (mínimo 3 caracteres)',
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Pergunta muito longa (máximo 500 caracteres)',
      });
    }

    // Montar request
    const chatRequest: ChatRequest = {
      user_id: userId,
      user_profile: userProfile,
      unit_id: unitId,
      unit_name: unitName,
      query: query.trim(),
      conversationId, // NOVO: Passar conversationId
      filters: filters || {},
    };

    // Processar pergunta
    const response = await chatService.ask(chatRequest);

    return res.json({
      success: response.success,
      data: {
        answer: response.answer,
        sources: response.sources,
        conversationId: response.conversationId, // NOVO: Retornar conversationId
        usage: {
          total_tokens: response.metadata.tokens_total,
          estimated_cost: response.metadata.cost_total
        },
      },
      error: response.error,
    });

  } catch (error) {
    console.error('[ChatRoutes] Erro em /ask:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar pergunta',
    });
  }
});

/**
 * GET /api/chat/history
 * Histórico de perguntas do usuário
 * 
 * Query params:
 * - limit: número de registros (padrão: 20, máximo: 100)
 */
router.get('/history', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { data: history, error } = await supabase
      .from('chat_logs')
      .select('id, query, answer, chunks_found, cost_total, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        history: history || [],
        total: history?.length || 0,
      },
    });

  } catch (error) {
    console.error('[ChatRoutes] Erro em /history:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico',
    });
  }
});

/**
 * GET /api/chat/stats
 * Estatísticas globais do chat (TI apenas)
 */
router.get('/stats', authGuard, tiOnlyGuard, async (_req: Request, res: Response) => {
  try {
    // Buscar estatísticas da view
    const { data: stats, error: statsError } = await supabase
      .from('v_chat_stats')
      .select('*')
      .single();

    if (statsError) {
      throw statsError;
    }

    // Custo do mês atual
    const { data: monthlyCost, error: costError } = await supabase
      .rpc('calculate_monthly_chat_cost');

    if (costError) {
      console.error('[ChatRoutes] Erro ao calcular custo mensal:', costError);
    }

    res.json({
      success: true,
      data: {
        overall: stats || {},
        current_month: monthlyCost?.[0] || null,
      },
    });

  } catch (error) {
    console.error('[ChatRoutes] Erro em /stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas',
    });
  }
});

/**
 * GET /api/chat/popular
 * Queries mais populares (TI apenas)
 * 
 * Query params:
 * - limit: número de queries (padrão: 10, máximo: 50)
 */
router.get('/popular', authGuard, tiOnlyGuard, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const { data: popular, error } = await supabase
      .from('v_popular_queries')
      .select('*')
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        queries: popular || [],
        total: popular?.length || 0,
      },
    });

  } catch (error) {
    console.error('[ChatRoutes] Erro em /popular:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar queries populares',
    });
  }
});

/**
 * GET /api/chat/documents/most-cited
 * Documentos mais citados (TI apenas)
 * 
 * Query params:
 * - limit: número de documentos (padrão: 20, máximo: 50)
 */
router.get('/documents/most-cited', authGuard, tiOnlyGuard, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const { data: documents, error } = await supabase
      .from('v_most_cited_documents')
      .select('*')
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        documents: documents || [],
        total: documents?.length || 0,
      },
    });

  } catch (error) {
    console.error('[ChatRoutes] Erro em /documents/most-cited:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar documentos mais citados',
    });
  }
});

/**
 * GET /api/chat/conversations
 * Listar conversações do usuário
 */
router.get('/conversations', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = await conversationService.getUserConversations(userId, limit);

    return res.json({
      success: true,
      data: {
        conversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao buscar conversações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar conversações'
    });
  }
});

/**
 * GET /api/chat/conversations/:id/messages
 * Buscar mensagens de uma conversação
 */
router.get('/conversations/:id/messages', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verificar se conversa pertence ao usuário
    const conversation = await conversationService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversação não encontrada'
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const messages = await conversationService.getMessages(conversationId, limit);

    return res.json({
      success: true,
      data: {
        conversation,
        messages,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao buscar mensagens:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagens'
    });
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Deletar conversação
 */
router.delete('/conversations/:id', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;

    // Verificar permissão
    const conversation = await conversationService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversação não encontrada'
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    await conversationService.deleteConversation(conversationId);

    return res.json({
      success: true,
      message: 'Conversação deletada com sucesso'
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao deletar conversação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar conversação'
    });
  }
});

export default router;
