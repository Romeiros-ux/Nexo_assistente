/**
 * Types para sistema de conversação
 */

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    chunks_used?: number;
    tokens_input?: number;
    tokens_output?: number;
    cost?: number;
    sources?: Array<{
      document_id: string;
      document_name: string;
      similarity: number;
    }>;
  };
  created_at: string;
}

export interface CreateConversationRequest {
  user_id: string;
  title: string; // Auto-gerado ou fornecido
}

export interface CreateMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}
