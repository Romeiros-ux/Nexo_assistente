import { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/types/document";
import { ResponseDisplay } from "./ResponseDisplay";
import { ChatInput } from "./ChatInput";
import logoImage from "@/assets/logo.png";

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
  selectedDocumentCount: number;
}

export function ChatArea({ 
  messages, 
  onSendMessage, 
  onNewConversation,
  isLoading,
  selectedDocumentCount 
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="card-elevated h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-serif font-semibold text-foreground">Consulta</h2>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewConversation}
            disabled={isLoading}
          >
            Nova conversa
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Faça perguntas sobre os documentos selecionados
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <img 
              src={logoImage} 
              alt="Nexo - Assistente Educacional" 
              className="w-28 h-28 object-contain mb-4 animate-float animate-pulse-glow"
            />
            <h3 className="font-serif font-semibold text-lg text-foreground mb-2">
              Olá! Eu sou o Nexo
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Seu assistente educacional. Faça perguntas sobre indicadores, compare dados entre escolas, 
              solicite diagnósticos ou gere relatórios estruturados.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left max-w-lg">
              {[
                { icon: "📊", text: "Análises comparativas" },
                { icon: "📈", text: "Indicadores e tendências" },
                { icon: "📋", text: "Diagnósticos educacionais" },
                { icon: "🎯", text: "Planos de ação" },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-sm"
                >
                  <span>{item.icon}</span>
                  <span className="text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <ResponseDisplay key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-accent/10" />
                <div className="space-y-2">
                  <div className="h-3 w-48 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput 
        onSend={onSendMessage}
        isLoading={isLoading}
        disabled={selectedDocumentCount === 0}
      />
    </div>
  );
}
