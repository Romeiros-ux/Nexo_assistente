import { useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const suggestedQueries = [
  "Qual o índice de evasão escolar nos últimos 3 anos?",
  "Compare o desempenho das escolas municipais no IDEB",
  "Gere um diagnóstico sobre infraestrutura escolar",
  "Quais escolas precisam de intervenção prioritária?",
];

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {/* Suggested queries */}
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestedQueries.map((query, index) => (
          <button
            key={index}
            onClick={() => setInput(query)}
            disabled={isLoading || disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-accent" />
            {query.length > 40 ? query.slice(0, 40) + '...' : query}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled 
              ? "Selecione pelo menos um documento para iniciar..." 
              : "Digite sua pergunta sobre os documentos selecionados..."
            }
            disabled={isLoading || disabled}
            className="min-h-[52px] max-h-[200px] resize-none pr-4"
            rows={1}
          />
        </div>
        <Button 
          type="submit" 
          disabled={!input.trim() || isLoading || disabled}
          className="h-[52px] px-6 gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar
            </>
          )}
        </Button>
      </form>

      {disabled && (
        <p className="text-xs text-warning mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          Selecione documentos no painel lateral para habilitar consultas
        </p>
      )}
    </div>
  );
}
