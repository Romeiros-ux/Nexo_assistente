/**
 * Chat API Service
 * 
 * Serviço para interação com endpoints do chat conversacional.
 * Integra com backend FASE 3 - Chat com RAG + LLM
 */

import apiClient, { getErrorMessage } from './apiClient';

// ==========================================
// TYPES
// ==========================================

export interface ChatSource {
  documentId: string;
  documentTitle: string;
  documentType: string;
  similarity: number;
  content: string;
  chunkIndex: number;
}

export interface ChatAskRequest {
  query: string;
  conversationId?: string; // NOVO: ID da conversa (opcional para nova conversa)
  filters?: {
    document_type?: string;
    max_results?: number;
  };
}

export interface ChatAskResponse {
  success: boolean;
  data: {
    answer: string;
    sources: ChatSource[];
    conversationId: string | null;
    usage: {
      total_tokens: number;
      estimated_cost: number;
    };
  };
  error?: string;
}

export interface ChatHistoryItem {
  id: string;
  query: string;
  answer: string;
  chunks_found: number;
  tokens_used: number;
  cost: number;
  created_at: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  data: {
    items: ChatHistoryItem[];
    total: number;
    page: number;
    limit: number;
  };
}

// ==========================================
// API CALLS
// ==========================================

/**
 * Faz uma pergunta ao assistente
 * 
 * @param query - Pergunta do usuário (3-500 caracteres)
 * @param filters - Filtros opcionais de busca
 * @returns Resposta da IA com fontes citadas
 * 
 * @example
 * ```ts
 * const response = await chatService.ask({
 *   query: "Qual o calendário escolar de 2024?",
 *   filters: {
 *     document_type: "CALENDARIO"
 *   }
 * });
 * ```
 */
export const ask = async (request: ChatAskRequest): Promise<ChatAskResponse> => {
  try {
    const response = await apiClient.post<ChatAskResponse>('/chat/ask', request);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Busca histórico de perguntas do usuário
 * 
 * @param limit - Número de registros (padrão: 20, máx: 100)
 * @param page - Página atual (paginação)
 * @returns Lista de perguntas anteriores
 */
export const getHistory = async (limit = 20, page = 1): Promise<ChatHistoryResponse> => {
  try {
    const response = await apiClient.get<ChatHistoryResponse>('/chat/history', {
      params: { limit, page },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Busca estatísticas globais do chat (TI apenas)
 * 
 * @returns Métricas agregadas de uso
 */
export const getStats = async () => {
  try {
    const response = await apiClient.get('/chat/stats');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Busca perguntas mais frequentes (TI apenas)
 * 
 * @param limit - Número de queries populares
 * @returns Top queries mais feitas
 */
export const getPopularQueries = async (limit = 20) => {
  try {
    const response = await apiClient.get('/chat/popular', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Busca documentos mais citados (TI apenas)
 * 
 * @param limit - Número de documentos
 * @returns Documentos mais referenciados nas respostas
 */
export const getMostCitedDocuments = async (limit = 20) => {
  try {
    const response = await apiClient.get('/chat/documents/most-cited', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ==========================================
// EXPORT DEFAULT
// ==========================================

const chatService = {
  ask,
  getHistory,
  getStats,
  getPopularQueries,
  getMostCitedDocuments,
};

export default chatService;
