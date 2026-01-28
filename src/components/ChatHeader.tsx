import { LogOut, User, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

const ChatHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span className="font-display font-semibold text-foreground text-sm hidden sm:inline">
          Assistente IA
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent rounded-full">
          <Brain className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-medium text-primary">Online</span>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full hover:bg-secondary/80 transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-foreground text-sm font-medium hidden sm:inline max-w-[120px] truncate">
              {user?.name}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ChatHeader;
