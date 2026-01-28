/**
 * FASE 3 - Chat Service
 * 
 * Orquestrador principal do chat conversacional
 * - Integra busca semântica (RAG) com LLM
 * - Aplica governança automática
 * - Gera respostas institucionais com citações
 * - Registra auditoria completa
 * 
 * Arquitetura: Stateful com histórico de conversação
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import conversationService from './conversation.service';
import type { ConversationMessage } from '../types/conversation.types';
import searchService, { SearchQuery, SearchResult, SearchResultChunk } from './search.service';
import {
  SYSTEM_PROMPT,
  MODEL_CONFIG,
  buildChatPrompt,
  validateChatContext,
  FAIL_SAFE_MESSAGES,
  ChatContext,
  PROMPT_VERSION,
} from '../prompts/master.prompt';

// ===================================
// INTERFACES
// ===================================

export interface ChatRequest {
  user_id: string;
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_id?: string;
  unit_name?: string;
  query: string;
  conversationId?: string; // ID da conversa (opcional para nova conversa)
  filters?: {
    document_type?: string;
    max_results?: number;
  };
}

export interface ChatSource {
  document_id: string;
  document_name: string;
  document_type: string;
  chunk_content: string;
  similarity: number;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  conversationId: string; // Sempre retorna ID da conversa (nova ou existente)
  metadata: {
    query: string;
    user_profile: string;
    chunks_found: number;
    tokens_input: number;
    tokens_output: number;
    tokens_total: number;
    cost_search: number;
    cost_llm: number;
    cost_total: number;
    model: string;
    prompt_version: string;
    duration_ms: number;
  };
  error?: string;
}

interface LLMResponse {
  answer: string;
  tokens_input: number;
  tokens_output: number;
  cost: number;
}

// ===================================
// CONFIGURAÇÃO
// ===================================

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

// Verificar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[ChatService] ERRO: Variáveis Supabase não configuradas');
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
}

if (!openaiApiKey || openaiApiKey === 'your-openai-api-key-here') {
  console.error('[ChatService] ERRO: OpenAI API Key não configurada');
  throw new Error('OPENAI_API_KEY é obrigatória para o chat funcionar');
}

let supabase: SupabaseClient;
let openai: OpenAI;

try {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  openai = new OpenAI({ apiKey: openaiApiKey });
} catch (error) {
  console.error('[ChatService] ERRO ao inicializar clientes:', error);
  throw error;
}

// ===================================
// CHAT SERVICE
// ===================================

class ChatService {
  private readonly maxResults: number;

  constructor() {
    this.maxResults = 8; // Top-K padrão (alinhado com busca)

    console.log('[ChatService] Inicializado:', {
      model: MODEL_CONFIG.model,
      temperature: MODEL_CONFIG.temperature,
      max_tokens: MODEL_CONFIG.max_tokens,
      prompt_version: PROMPT_VERSION,
    });
  }

  /**
   * Processar pergunta do usuário e gerar resposta
   * Pipeline completo: Busca RAG → Prompt → LLM → Resposta
   */
  async ask(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    console.log('[ChatService] Nova pergunta recebida:', {
      user_id: request.user_id,
      profile: request.user_profile,
      query: request.query.substring(0, 100),
      conversationId: request.conversationId || 'nova conversa',
    });

    try {
      // 1. Validar request
      this.validateRequest(request);

      // 2. NOVO: Gerenciar conversação
      let conversationId = request.conversationId;
      let conversationHistory: ConversationMessage[] = [];

      if (conversationId) {
        // Conversa existente - buscar histórico
        const conversation = await conversationService.getConversation(conversationId);
        
        if (!conversation) {
          throw new Error('Conversação não encontrada');
        }
        
        if (conversation.user_id !== request.user_id) {
          throw new Error('Acesso negado à conversação');
        }

        // Buscar últimas 4 mensagens (2 pares user/assistant)
        conversationHistory = await conversationService.getMessages(conversationId, 4);
        
        console.log(`[ChatService] Histórico recuperado: ${conversationHistory.length} mensagens`);
      } else {
        // Nova conversa - criar
        const title = conversationService.generateTitle(request.query);
        const newConversation = await conversationService.createConversation({
          user_id: request.user_id,
          title
        });
        conversationId = newConversation.id;
        
        console.log(`[ChatService] Nova conversa criada: ${conversationId}`);
      }

      // 3. Salvar pergunta do usuário
      await conversationService.addMessage({
        conversation_id: conversationId,
        role: 'user',
        content: request.query,
      });

      // 4. Executar busca semântica (RAG)
      const searchResult = await this.performSemanticSearch(request);

      console.log(`[ChatService] Busca completada: ${searchResult.results.length} chunks encontrados`);

      // 5. Verificar se há chunks (fail-safe)
      if (searchResult.results.length === 0) {
        return this.buildNoChunksResponse(request, conversationId, startTime);
      }

      // 6. Montar contexto para o LLM (com histórico)
      const context: ChatContext = {
        user_profile: request.user_profile,
        unit_name: request.unit_name,
        query: request.query,
        chunks: searchResult.results.map((chunk: SearchResultChunk) => ({
          content: chunk.content,
          source: {
            document_name: chunk.source.document_name,
            document_type: chunk.source.document_type,
          },
          similarity: chunk.similarity,
          metadata: chunk.metadata,
        })),
        conversationHistory, // NOVO: Histórico da conversa
      };

      // 7. Validar contexto
      const validation = validateChatContext(context);
      if (!validation.valid) {
        throw new Error(`Contexto inválido: ${validation.error}`);
      }

      // 8. Gerar resposta com LLM
      const llmResponse = await this.generateLLMResponse(context);

      console.log('[ChatService] Resposta gerada:', {
        tokens_input: llmResponse.tokens_input,
        tokens_output: llmResponse.tokens_output,
        cost: `$${llmResponse.cost.toFixed(6)}`,
      });

      // 9. Formatar fontes citadas
      const sources: ChatSource[] = searchResult.results.map((chunk: SearchResultChunk) => ({
        document_id: chunk.source.document_id,
        document_name: chunk.source.document_name,
        document_type: chunk.source.document_type,
        chunk_content: chunk.content.substring(0, 200) + '...', // Preview
        similarity: chunk.similarity,
      }));

      // 10. Salvar resposta do assistente
      await conversationService.addMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: llmResponse.answer,
        metadata: {
          chunks_used: searchResult.results.length,
          tokens_input: llmResponse.tokens_input,
          tokens_output: llmResponse.tokens_output,
          cost: llmResponse.cost,
          sources: sources.slice(0, 3), // Top 3 sources
        }
      });

      // 11. Salvar log de auditoria (fire-and-forget)
      this.logChat(request, searchResult, llmResponse, llmResponse.answer).catch((err) => {
        console.error('[ChatService] Erro ao salvar log:', err);
      });

      const duration = Date.now() - startTime;

      // 12. Retornar resposta completa
      return {
        success: true,
        answer: llmResponse.answer,
        sources,
        conversationId, // NOVO: Retornar ID da conversa
        metadata: {
          query: request.query,
          user_profile: request.user_profile,
          chunks_found: searchResult.results.length,
          tokens_input: llmResponse.tokens_input,
          tokens_output: llmResponse.tokens_output,
          tokens_total: llmResponse.tokens_input + llmResponse.tokens_output,
          cost_search: searchResult.search_cost,
          cost_llm: llmResponse.cost,
          cost_total: searchResult.search_cost + llmResponse.cost,
          model: MODEL_CONFIG.model,
          prompt_version: PROMPT_VERSION,
          duration_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ChatService] Erro ao processar pergunta:', error);

      // Tentar criar conversação mesmo em erro (se não existir)
      let errorConversationId = request.conversationId;
      if (!errorConversationId) {
        try {
          const title = conversationService.generateTitle(request.query);
          const newConversation = await conversationService.createConversation({
            user_id: request.user_id,
            title: `[ERRO] ${title}`
          });
          errorConversationId = newConversation.id;
        } catch (convError) {
          console.error('[ChatService] Erro ao criar conversação de erro:', convError);
          errorConversationId = 'error-unknown';
        }
      }

      return {
        success: false,
        answer: this.getErrorMessage(error),
        sources: [],
        conversationId: errorConversationId, // NOVO: Retornar ID mesmo em erro
        metadata: {
          query: request.query,
          user_profile: request.user_profile,
          chunks_found: 0,
          tokens_input: 0,
          tokens_output: 0,
          tokens_total: 0,
          cost_search: 0,
          cost_llm: 0,
          cost_total: 0,
          model: MODEL_CONFIG.model,
          prompt_version: PROMPT_VERSION,
          duration_ms: duration,
        },
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Validar request básico
   */
  private validateRequest(request: ChatRequest): void {
    if (!request.query || request.query.trim().length < 3) {
      throw new Error('INVALID_QUERY: Pergunta muito curta (mínimo 3 caracteres)');
    }

    if (request.query.length > 500) {
      throw new Error('INVALID_QUERY: Pergunta muito longa (máximo 500 caracteres)');
    }

    if (!['DIRETOR', 'COMISSAO', 'SECRETARIA', 'TI'].includes(request.user_profile)) {
      throw new Error('INVALID_PROFILE: Perfil de usuário inválido');
    }

    if (request.user_profile === 'DIRETOR' && !request.unit_id) {
      throw new Error('INVALID_REQUEST: Diretor deve ter unidade vinculada');
    }
  }

  /**
   * Busca semântica usando search.service.ts com roteamento por domínio
   * REUSA: search.service.ts com toda governança + classificação inteligente
   */
  private async performSemanticSearch(request: ChatRequest): Promise<SearchResult> {
    const searchQuery: SearchQuery = {
      query: request.query,
      user_id: request.user_id,
      user_profile: request.user_profile,
      unit_id: request.unit_id,
      filters: {
        document_type: request.filters?.document_type,
        max_results: request.filters?.max_results || this.maxResults,
        // Threshold dinâmico já é aplicado automaticamente no searchService
      },
    };

    // Usa o novo método com roteamento inteligente por domínio
    return await searchService.searchWithDomainRouting(searchQuery);
  }

  /**
   * Gerar resposta usando LLM (gpt-4o-mini)
   */
  private async generateLLMResponse(context: ChatContext): Promise<LLMResponse> {
    try {
      // Montar prompt completo
      const userPrompt = buildChatPrompt(context);

      console.log('[ChatService] Chamando OpenAI:', {
        model: MODEL_CONFIG.model,
        chunks: context.chunks.length,
        query_length: context.query.length,
      });

      // Chamar OpenAI
      const completion = await openai.chat.completions.create({
        model: MODEL_CONFIG.model,
        temperature: MODEL_CONFIG.temperature,
        max_tokens: MODEL_CONFIG.max_tokens,
        top_p: MODEL_CONFIG.top_p,
        frequency_penalty: MODEL_CONFIG.frequency_penalty,
        presence_penalty: MODEL_CONFIG.presence_penalty,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const answer = completion.choices[0]?.message?.content || '';
      const tokensInput = completion.usage?.prompt_tokens || 0;
      const tokensOutput = completion.usage?.completion_tokens || 0;

      // Calcular custo (gpt-4o-mini pricing)
      // Input: $0.150 / 1M tokens
      // Output: $0.600 / 1M tokens
      const costInput = (tokensInput / 1_000_000) * 0.15;
      const costOutput = (tokensOutput / 1_000_000) * 0.6;
      const costTotal = costInput + costOutput;

      return {
        answer,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost: costTotal,
      };

    } catch (error) {
      console.error('[ChatService] Erro ao chamar OpenAI:', error);

      // Tratar erros específicos da OpenAI
      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          throw new Error('RATE_LIMIT: Muitas requisições. Aguarde alguns segundos.');
        }
        if (error.message.includes('insufficient_quota')) {
          throw new Error('API_ERROR: Créditos OpenAI esgotados. Contate TI.');
        }
      }

      throw new Error('API_ERROR: Falha ao gerar resposta. Tente novamente.');
    }
  }

  /**
   * Construir resposta quando não há chunks (fail-safe)
   */
  private buildNoChunksResponse(request: ChatRequest, conversationId: string, startTime: number): ChatResponse {
    const duration = Date.now() - startTime;

    console.log('[ChatService] Nenhum chunk encontrado - retornando resposta padrão');

    return {
      success: true,
      answer: FAIL_SAFE_MESSAGES.NO_CHUNKS,
      sources: [],
      conversationId, // NOVO: Incluir conversationId
      metadata: {
        query: request.query,
        user_profile: request.user_profile,
        chunks_found: 0,
        tokens_input: 0,
        tokens_output: 0,
        tokens_total: 0,
        cost_search: 0,
        cost_llm: 0,
        cost_total: 0,
        model: MODEL_CONFIG.model,
        prompt_version: PROMPT_VERSION,
        duration_ms: duration,
      },
    };
  }

  /**
   * Obter mensagem de erro amigável
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.startsWith('RATE_LIMIT:')) {
        return FAIL_SAFE_MESSAGES.RATE_LIMIT;
      }
      if (error.message.startsWith('API_ERROR:')) {
        return FAIL_SAFE_MESSAGES.API_ERROR;
      }
      if (error.message.startsWith('INVALID_QUERY:')) {
        return FAIL_SAFE_MESSAGES.INVALID_QUERY;
      }
    }

    return FAIL_SAFE_MESSAGES.API_ERROR;
  }

  /**
   * Salvar log de auditoria no banco
   * Fire-and-forget: não bloqueia resposta ao usuário
   */
  private async logChat(
    request: ChatRequest,
    searchResult: SearchResult,
    llmResponse: LLMResponse,
    answer: string
  ): Promise<void> {
    try {
      // Log principal do chat
      const { data: chatLog, error: chatError } = await supabase
        .from('chat_logs')
        .insert({
          user_id: request.user_id,
          user_profile: request.user_profile,
          unit_id: request.unit_id,
          query: request.query,
          answer: answer,
          chunks_found: searchResult.results.length,
          tokens_input: llmResponse.tokens_input,
          tokens_output: llmResponse.tokens_output,
          cost_search: searchResult.search_cost,
          cost_llm: llmResponse.cost,
          cost_total: searchResult.search_cost + llmResponse.cost,
          model: MODEL_CONFIG.model,
          prompt_version: PROMPT_VERSION,
        })
        .select('id')
        .single();

      if (chatError) {
        console.error('[ChatService] Erro ao salvar chat_logs:', chatError);
        return;
      }

      // Log de citações (documentos usados)
      if (chatLog && searchResult.results.length > 0) {
        const citations = searchResult.results.map((chunk: SearchResultChunk) => ({
          chat_log_id: chatLog.id,
          document_id: chunk.source.document_id,
          document_name: chunk.source.document_name,
          document_type: chunk.source.document_type,
          chunk_id: chunk.chunk_id,
          similarity: chunk.similarity,
        }));

        const { error: citationsError } = await supabase
          .from('chat_citations')
          .insert(citations);

        if (citationsError) {
          console.error('[ChatService] Erro ao salvar chat_citations:', citationsError);
        }
      }

    } catch (error) {
      console.error('[ChatService] Erro inesperado ao salvar logs:', error);
    }
  }
}

// Singleton
const chatService = new ChatService();
export default chatService;
