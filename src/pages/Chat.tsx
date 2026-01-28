import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import ChatSources from '@/components/ChatSources';
import WelcomeSection from '@/components/WelcomeSection';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/contexts/ConversationsContext';
import chatService, { ChatSource } from '@/lib/chatService';
import { useToast } from '@/hooks/use-toast';

const Chat: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const { 
    currentConversation, 
    currentConversationId,
    createConversation, 
    addMessage,
    updateBackendConversationId,
  } = useConversations();
  
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSendMessage = async (content: string) => {
    let conversationId = currentConversationId;
    
    // Create new conversation if none selected
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Add user message
    addMessage(conversationId, {
      content,
      isAI: false,
    });

    setIsTyping(true);
    // Limpa fontes da pergunta anterior antes de fazer nova consulta
    setSources([]);

    try {
      // Pega o backendConversationId se já existir
      const backendId = currentConversation?.backendConversationId;
      
      // Chama API real do chat
      const response = await chatService.ask({
        query: content,
        conversationId: backendId, // Envia UUID do backend (ou undefined para criar nova)
      });

      if (response.success) {
        // Salva backendConversationId retornado pelo backend
        if (response.data.conversationId && conversationId) {
          updateBackendConversationId(conversationId, response.data.conversationId);
        }

        // Add AI response
        addMessage(conversationId, {
          content: response.data.answer,
          isAI: true,
        });

        // Salva fontes para exibição
        setSources(response.data.sources || []);

        // Mostra custo (opcional, apenas para TI)
        if (response.data.usage) {
          console.log(`Tokens usados: ${response.data.usage.total_tokens}`);
          console.log(`Custo estimado: $${response.data.usage.estimated_cost.toFixed(5)}`);
        }
      } else {
        throw new Error(response.error || 'Erro ao processar pergunta');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pergunta';
      
      // Add error message
      addMessage(conversationId, {
        content: `❌ **Erro:** ${errorMessage}\n\nPor favor, tente novamente ou entre em contato com o suporte.`,
        isAI: true,
      });

      toast({
        title: 'Erro no chat',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const messages = currentConversation?.messages || [];

  return (
    <div className="min-h-screen flex bg-gradient-hero overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="header-bar px-4 py-3 flex items-center justify-between flex-shrink-0 z-40">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <ChatHeader />
          </div>
          
          {/* Botão de Sair */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={logout}
            className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </header>
        
        {/* Messages - Área de scroll isolada */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !currentConversationId ? (
              <WelcomeSection onSuggestionClick={handleSendMessage} />
            ) : messages.length === 0 ? (
              <WelcomeSection onSuggestionClick={handleSendMessage} />
            ) : (
              <div className="py-6 px-4 space-y-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    content={message.content}
                    isAI={message.isAI}
                  />
                ))}
                
                {isTyping && (
                  <div className="flex gap-4 items-start animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                      </div>
                    </div>
                    <div className="chat-bubble-ai">
                      <span className="text-sm text-muted-foreground">Buscando informações nos documentos institucionais...</span>
                    </div>
                  </div>
                )}

                {/* Fontes citadas */}
                <ChatSources sources={sources} />
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Chat;
