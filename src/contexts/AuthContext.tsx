import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '@/services/auth.service';
import type { User } from '@/types/api.types';
import { getErrorMessage } from '@/lib/apiClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // INICIALIZAÇÃO - Verifica se já está logado
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔵 AuthContext - Inicializando...');
      try {
        // Verifica se tem token salvo
        const hasToken = authService.isAuthenticated();
        console.log('🔵 AuthContext - Token existe?', hasToken);
        
        if (hasToken) {
          // Tenta buscar dados atualizados do usuário
          console.log('🔵 AuthContext - Buscando usuário atual...');
          try {
            const currentUser = await authService.getCurrentUser();
            console.log('🔵 AuthContext - Usuário recebido:', currentUser);
            
            if (currentUser) {
              setUser(currentUser);
            } else {
              // Se getCurrentUser retornar undefined, tenta localStorage
              console.log('⚠️ AuthContext - getCurrentUser retornou undefined, tentando localStorage');
              const savedUser = authService.getUser();
              if (savedUser) {
                console.log('✅ AuthContext - Usando usuário do localStorage:', savedUser);
                setUser(savedUser);
              } else {
                console.log('❌ AuthContext - Nenhum usuário encontrado, limpando auth');
                authService.clearAuth();
                setUser(null);
              }
            }
          } catch (apiError) {
            // Se a API falhar (token inválido, rede, etc), usa localStorage
            console.warn('⚠️ AuthContext - Erro ao buscar usuário da API, usando localStorage:', apiError);
            const savedUser = authService.getUser();
            if (savedUser) {
              console.log('✅ AuthContext - Usando usuário do localStorage (fallback):', savedUser);
              setUser(savedUser);
            } else {
              console.log('❌ AuthContext - Nenhum usuário no localStorage, limpando auth');
              authService.clearAuth();
              setUser(null);
            }
          }
        } else {
          // Sem token, busca usuário do localStorage
          const savedUser = authService.getUser();
          console.log('🔵 AuthContext - Usuário salvo no localStorage:', savedUser);
          if (savedUser) {
            setUser(savedUser);
          }
        }
      } catch (error) {
        console.error('❌ AuthContext - Erro crítico ao inicializar autenticação:', error);
        // Se falhar, limpa autenticação
        authService.clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('🔵 AuthContext - Inicialização concluída');
      }
    };

    initAuth();
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);

      const response = await authService.login({ email, password });

      setUser(response.user);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Erro no login:', message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpa estado local
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  /**
   * Verifica se usuário tem uma role específica
   */
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  /**
   * Verifica se usuário tem uma das roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    hasRole,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// HOOK
// ==========================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
