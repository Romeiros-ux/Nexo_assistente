import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  backendConversationId?: string; // UUID do backend (Supabase)
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationsContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentConversation: Conversation | null;
  createConversation: () => string;
  selectConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateBackendConversationId: (frontendId: string, backendId: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

const STORAGE_KEY = 'edu_ai_conversations';

export const ConversationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const loadedConversations = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setConversations(loadedConversations);
      } catch (e) {
        console.error('Failed to load conversations:', e);
      }
    }
  }, []);

  // Save to localStorage whenever conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const createConversation = (): string => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  };

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const addMessage = (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        // Update title based on first user message
        let title = conv.title;
        if (conv.messages.length === 0 && !message.isAI) {
          title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
        }
        return {
          ...conv,
          title,
          messages: [...conv.messages, newMessage],
          updatedAt: new Date(),
        };
      }
      return conv;
    }));
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  const updateBackendConversationId = (frontendId: string, backendId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === frontendId ? { ...conv, backendConversationId: backendId } : conv
    ));
  };

  const renameConversation = (id: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, title, updatedAt: new Date() } : conv
    ));
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;

  return (
    <ConversationsContext.Provider value={{
      conversations,
      currentConversationId,
      currentConversation,
      createConversation,
      selectConversation,
      addMessage,
      updateBackendConversationId,
      deleteConversation,
      renameConversation,
    }}>
      {children}
    </ConversationsContext.Provider>
  );
};

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
};
