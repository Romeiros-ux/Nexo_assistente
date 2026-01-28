import { FileText, TrendingUp } from 'lucide-react';
import { ChatSource } from '@/lib/chatService';

interface ChatSourcesProps {
  sources: ChatSource[];
}

/**
 * Componente para exibir fontes citadas pelo assistente
 * Mostra documentos consultados com score de similaridade
 */
const ChatSources: React.FC<ChatSourcesProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-6 p-5 bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl border border-accent/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Documentos Consultados ({sources.length})
        </h3>
      </div>
      
      <div className="space-y-4">
        {sources.map((source, index) => (
          <div 
            key={index} 
            className="group p-4 bg-card/80 hover:bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              {/* Número da citação */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Título do documento */}
                <div className="font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                  {source.documentTitle}
                </div>
                
                {/* Metadados */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {(source.similarity * 100).toFixed(1)}% relevante
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-accent/50 rounded-full">
                    {source.documentType}
                  </span>
                </div>
                
                {/* Trecho do documento */}
                <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  "{source.content}"
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Todas as fontes são documentos institucionais oficiais indexados no sistema
      </p>
    </div>
  );
};

export default ChatSources;
