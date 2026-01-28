/**
 * Conversation Service
 * Gerencia histórico de conversações
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Conversation, 
  ConversationMessage,
  CreateConversationRequest,
  CreateMessageRequest 
} from '../types/conversation.types';

class ConversationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Criar nova conversação
   */
  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        id: uuidv4(),
        user_id: request.user_id,
        title: request.title,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar conversação: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar conversação por ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Erro ao buscar conversação: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar últimas conversações do usuário
   */
  async getUserConversations(userId: string, limit = 20): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar conversações: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Adicionar mensagem à conversação
   */
  async addMessage(request: CreateMessageRequest): Promise<ConversationMessage> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .insert({
        id: uuidv4(),
        conversation_id: request.conversation_id,
        role: request.role,
        content: request.content,
        metadata: request.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar mensagem: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar histórico de mensagens (últimas N)
   */
  async getMessages(conversationId: string, limit = 10): Promise<ConversationMessage[]> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }) // Ordem cronológica
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar mensagens: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Deletar conversação (e todas as mensagens - CASCADE)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Erro ao deletar conversação: ${error.message}`);
    }
  }

  /**
   * Gerar título automático da conversa baseado na primeira pergunta
   */
  generateTitle(firstQuery: string): string {
    // Limitar a 50 caracteres
    const truncated = firstQuery.substring(0, 50);
    return truncated.length < firstQuery.length ? `${truncated}...` : truncated;
  }
}

// Singleton
const conversationService = new ConversationService();
export default conversationService;
