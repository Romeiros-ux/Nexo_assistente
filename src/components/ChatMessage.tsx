import { User } from 'lucide-react';
import Mascot from './Mascot';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  content: string;
  isAI: boolean;
  timestamp?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, isAI }) => {
  return (
    <div className={`flex gap-4 animate-slide-up ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="flex-shrink-0 mt-1">
          <Mascot size="sm" animate={false} />
        </div>
      )}
      
      <div className={`max-w-[85%] ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
        {isAI ? (
          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-base font-display font-bold text-foreground mt-0 mb-3 pb-2 border-b border-border first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-foreground mt-5 mb-2 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-card-foreground leading-relaxed mb-3 last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="text-sm space-y-1.5 mb-3 pl-0 list-none">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="text-sm text-card-foreground flex items-start gap-2">
                    <span className="text-primary mt-1.5 text-[6px]">●</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="text-sm space-y-1.5 mb-3 pl-0 list-decimal list-inside">
                    {children}
                  </ol>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-muted-foreground italic">{children}</em>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full text-sm border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 text-left font-medium text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-card-foreground">
                    {children}
                  </td>
                ),
                hr: () => (
                  <hr className="my-4 border-border" />
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 my-3 text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{content}</p>
        )}
      </div>
      
      {!isAI && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
