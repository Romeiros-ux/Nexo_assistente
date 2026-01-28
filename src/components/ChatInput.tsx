import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const maxLength = 500;
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;

  const handleSend = () => {
    if (message.trim() && message.length <= maxLength && message.length >= 3) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="card-premium p-2 flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Faça uma pergunta ou peça uma análise..."
              disabled={disabled}
              className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-4 py-3 text-sm placeholder:text-muted-foreground/70"
              rows={1}
              maxLength={maxLength}
            />
            {message.length > 0 && (
              <div className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-500 font-semibold' : 
                isNearLimit ? 'text-orange-500' : 
                'text-muted-foreground'
              }`}>
                {remainingChars} caracteres
              </div>
            )}
          </div>
          <Button 
            onClick={handleSend} 
            disabled={disabled || !message.trim() || message.length < 3 || isOverLimit}
            size="lg"
            className="h-12 px-5 rounded-xl institutional-gradient hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/20 disabled:shadow-none"
          >
            {disabled ? (
              <Sparkles className="w-5 h-5 animate-pulse" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {message.length < 3 && message.length > 0 ? (
            <span className="text-orange-500">Mínimo de 3 caracteres</span>
          ) : (
            <>Respostas baseadas em documentos institucionais homologados</>
          )}
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
