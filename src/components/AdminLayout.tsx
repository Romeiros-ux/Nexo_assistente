import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Database, 
  MessageSquare, 
  LogOut, 
  ChevronLeft,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin/users', label: 'Usuários e Perfis', icon: Users },
    { path: '/admin/knowledge', label: 'Base de Dados', icon: Database },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="header-bar px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/chat')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Voltar ao Chat</span>
          </Button>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <div className="hidden sm:flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground text-sm">Administração</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.name}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-57px)] bg-card border-r border-border p-4 hidden md:block">
          <div className="mb-6">
            <Logo size="sm" />
          </div>
          
          <nav className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <div className="mt-8 pt-6 border-t border-border">
            <Link
              to="/chat"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Chat do Assistente</span>
            </Link>
          </div>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around z-50">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
          <Link
            to="/chat"
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-muted-foreground"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">Chat</span>
          </Link>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
