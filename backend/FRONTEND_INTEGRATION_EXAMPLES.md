# 🔌 Exemplos de Integração Frontend (TypeScript/React)

> **Nota**: Este arquivo contém exemplos de código TypeScript/React para referência.
> O backend está implementado e seguindo este contrato.
> Use este arquivo como guia para implementar no frontend.

---

## 📦 Types (Copiar para o Frontend)

```typescript
// types/api.ts

export type UserRole = 
  | 'TI' 
  | 'Comissão' 
  | 'Diretor' 
  | 'Coordenação' 
  | 'Secretaria de Educação';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type UnitType = 'school' | 'center' | 'department';
export type UnitStatus = 'active' | 'inactive';

export interface EducationalUnit {
  id: string;
  name: string;
  type: UnitType;
  code?: string;
  address?: string;
  phone?: string;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

// Resposta de sucesso genérica
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  total?: number;
}

// Resposta de erro
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

// Union type para qualquer resposta
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Resposta específica de login
export interface LoginResponse {
  success: true;
  message: string;
  data: {
    token: string;
    expiresIn: string;
    user: User;
  };
}
```

---

## 🔐 API Client (Copiar para o Frontend)

```typescript
// lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Obtém o token do localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Remove o token e redireciona para login
   */
  private handleUnauthorized() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  /**
   * Faz uma requisição HTTP
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      // Trata erro 401 (não autenticado)
      if (response.status === 401) {
        this.handleUnauthorized();
        return data;
      }

      // Retorna resposta (sucesso ou erro)
      return data;

    } catch (error) {
      // Erro de rede ou parsing
      console.error('API Error:', error);
      return {
        success: false,
        error: 'Erro de conexão com o servidor',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
```

---

## 🔑 Auth Service (Copiar para o Frontend)

```typescript
// services/authService.ts

import { api } from '@/lib/api';
import type { LoginResponse, User, ApiResponse } from '@/types/api';

export const authService = {
  /**
   * Faz login do usuário
   */
  async login(email: string, password: string): Promise<LoginResponse | ErrorResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // Se sucesso, salva token
    if (response.success) {
      localStorage.setItem('token', response.data.token);
      return response;
    }

    return response;
  },

  /**
   * Busca dados do usuário autenticado
   */
  async me(): Promise<ApiResponse<User>> {
    return api.get<User>('/auth/me');
  },

  /**
   * Faz logout
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },

  /**
   * Verifica se há token salvo
   */
  hasToken(): boolean {
    return !!localStorage.getItem('token');
  },

  /**
   * Obtém o token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },
};
```

---

## 👥 Users Service (Copiar para o Frontend)

```typescript
// services/usersService.ts

import { api } from '@/lib/api';
import type { User, EducationalUnit, ApiResponse } from '@/types/api';

export const usersService = {
  /**
   * Lista todos os usuários (Admin only)
   */
  async getAll(): Promise<ApiResponse<User[]>> {
    return api.get<User[]>('/users');
  },

  /**
   * Busca usuário por ID
   */
  async getById(id: string): Promise<ApiResponse<User>> {
    return api.get<User>(`/users/${id}`);
  },

  /**
   * Cria novo usuário (Admin only)
   */
  async create(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<ApiResponse<User>> {
    return api.post<User>('/users', userData);
  },

  /**
   * Atualiza usuário (Admin only)
   */
  async update(
    id: string,
    userData: Partial<User>
  ): Promise<ApiResponse<User>> {
    return api.put<User>(`/users/${id}`, userData);
  },

  /**
   * Deleta usuário (Admin only)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/users/${id}`);
  },

  /**
   * Busca unidades de um usuário
   */
  async getUnits(userId: string): Promise<ApiResponse<EducationalUnit[]>> {
    return api.get<EducationalUnit[]>(`/users/${userId}/units`);
  },

  /**
   * Vincula usuário a unidades (Admin only)
   */
  async linkUnits(
    userId: string,
    unitIds: string[]
  ): Promise<ApiResponse<EducationalUnit[]>> {
    return api.post<EducationalUnit[]>(`/users/${userId}/units`, {
      unit_ids: unitIds,
    });
  },
};
```

---

## 🏫 Units Service (Copiar para o Frontend)

```typescript
// services/unitsService.ts

import { api } from '@/lib/api';
import type { EducationalUnit, ApiResponse } from '@/types/api';

export const unitsService = {
  /**
   * Lista unidades (filtrado por role do usuário)
   */
  async getAll(): Promise<ApiResponse<EducationalUnit[]>> {
    return api.get<EducationalUnit[]>('/educational-units');
  },

  /**
   * Busca unidade por ID
   */
  async getById(id: string): Promise<ApiResponse<EducationalUnit>> {
    return api.get<EducationalUnit>(`/educational-units/${id}`);
  },

  /**
   * Cria nova unidade (Admin only)
   */
  async create(unitData: {
    name: string;
    type: 'school' | 'center' | 'department';
    code?: string;
    address?: string;
    phone?: string;
  }): Promise<ApiResponse<EducationalUnit>> {
    return api.post<EducationalUnit>('/educational-units', unitData);
  },

  /**
   * Atualiza unidade (Admin only)
   */
  async update(
    id: string,
    unitData: Partial<EducationalUnit>
  ): Promise<ApiResponse<EducationalUnit>> {
    return api.put<EducationalUnit>(`/educational-units/${id}`, unitData);
  },

  /**
   * Deleta unidade (Admin only)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/educational-units/${id}`);
  },

  /**
   * Obtém filtro para o usuário atual (uso do assistente IA)
   */
  async getFilterForUser(): Promise<
    ApiResponse<{
      hasAccess: boolean;
      unitIds: string[];
      isAdmin: boolean;
      filterRequired: boolean;
    }>
  > {
    return api.get('/educational-units/filter/for-user');
  },
};
```

---

## 🎭 AuthContext (Copiar para o Frontend)

```typescript
// contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import type { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica se usuário está autenticado ao carregar
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Verifica autenticação (chama GET /auth/me)
   */
  const checkAuth = async () => {
    if (!authService.hasToken()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.me();
      
      if (response.success) {
        setUser(response.data);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Faz login
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(email, password);
      
      if (response.success) {
        setUser(response.data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  /**
   * Faz logout
   */
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'TI',
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar o contexto
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  
  return context;
}
```

---

## 🛡️ Protected Route (Copiar para o Frontend)

```typescript
// components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // Aguarda verificação de autenticação
  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Se não estiver autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se rota é só para admin e usuário não é admin, redireciona
  if (adminOnly && !isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}
```

---

## 🚦 Uso no Router (Copiar para o Frontend)

```typescript
// App.tsx ou router.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// Páginas
import Login from '@/pages/Login';
import Chat from '@/pages/Chat';
import AdminDashboard from '@/pages/admin/Dashboard';
import UsersPage from '@/pages/admin/UsersProfiles';
import UnitsPage from '@/pages/admin/KnowledgeBase';

function LoginRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    // Se autenticado, redireciona baseado no role
    return <Navigate to={isAdmin ? '/admin' : '/chat'} replace />;
  }

  return <Login />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<LoginRedirect />} />

          {/* Rotas protegidas (qualquer usuário autenticado) */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          {/* Rotas de admin (apenas TI) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/units"
            element={
              <ProtectedRoute adminOnly>
                <UnitsPage />
              </ProtectedRoute>
            }
          />

          {/* Rota raiz */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## 📄 Exemplo de Página de Login

```typescript
// pages/Login.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        // Redireciona baseado no role
        // isAdmin já está atualizado após o login
        navigate(isAdmin ? '/admin' : '/chat');
      } else {
        setError('Email ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>
        
        {error && <div className="error">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

---

## 📊 Exemplo de Listagem de Usuários (Admin)

```typescript
// pages/admin/UsersPage.tsx

import { useState, useEffect } from 'react';
import { usersService } from '@/services/usersService';
import type { User } from '@/types/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersService.getAll();
      
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente deletar este usuário?')) return;

    const response = await usersService.delete(id);
    
    if (response.success) {
      setUsers(users.filter((u) => u.id !== id));
    } else {
      alert(response.error);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Usuários</h1>
      
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <button onClick={() => handleDelete(user.id)}>
                  Deletar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ Checklist de Integração

### Setup Inicial
- [ ] Copiar types para `src/types/api.ts`
- [ ] Criar `src/lib/api.ts` com ApiClient
- [ ] Criar services: `authService`, `usersService`, `unitsService`
- [ ] Configurar variável de ambiente `VITE_API_URL`

### Autenticação
- [ ] Implementar `AuthContext` com `AuthProvider`
- [ ] Criar hook `useAuth()`
- [ ] Implementar página de Login
- [ ] Criar `ProtectedRoute` component
- [ ] Configurar rotas no Router

### Validações
- [ ] Verificar `user.role === 'TI'` para identificar admin
- [ ] Redirecionar admin para `/admin` após login
- [ ] Redirecionar outros para `/chat` após login
- [ ] Proteger rotas admin com `adminOnly` prop

### Tratamento de Erros
- [ ] Capturar 401 → remover token e redirecionar para login
- [ ] Capturar 403 → mostrar "Acesso negado"
- [ ] Mostrar erros de validação ao usuário

---

**✅ Exemplos completos de integração frontend prontos!**
