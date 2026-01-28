import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConversations, Conversation } from '@/contexts/ConversationsContext';
import Mascot from './Mascot';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    conversations, 
    currentConversationId, 
    createConversation, 
    selectConversation,
    deleteConversation,
    renameConversation 
  } = useConversations();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewConversation = () => {
    createConversation();
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
  };

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { label: string; conversations: Conversation[] }[] = [
      { label: 'Hoje', conversations: [] },
      { label: 'Ontem', conversations: [] },
      { label: 'Últimos 7 dias', conversations: [] },
      { label: 'Anteriores', conversations: [] },
    ];

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      if (convDate.toDateString() === today.toDateString()) {
        groups[0].conversations.push(conv);
      } else if (convDate.toDateString() === yesterday.toDateString()) {
        groups[1].conversations.push(conv);
      } else if (convDate > lastWeek) {
        groups[2].conversations.push(conv);
      } else {
        groups[3].conversations.push(conv);
      }
    });

    return groups.filter(g => g.conversations.length > 0);
  }, [conversations]);

  if (!isOpen) {
    return (
      <div className="w-0 md:w-14 bg-card border-r border-border flex flex-col items-center py-4 transition-all duration-300">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleNewConversation}
          className="mb-2"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <div className="flex-1" />
        <Link to="/admin/users">
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col h-full transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mascot size="sm" animate={false} />
            <span className="font-display font-semibold text-sm">Edu IA</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
        <Button 
          onClick={handleNewConversation}
          className="w-full institutional-gradient"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {groupedConversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inicie uma nova conversa para começar
            </p>
          </div>
        ) : (
          groupedConversations.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    
                    {editingId === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-6 text-xs"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); saveEditing(); }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">
                          {conv.title}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(conv); }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link to="/admin/users">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            <Settings className="w-4 h-4 mr-2" />
            Administração
          </Button>
        </Link>
      </div>
    </aside>
  );
};

export default ChatSidebar;
