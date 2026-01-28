/**
 * Serviço de Autenticação
 * 
 * Gerencia todas as operações de autenticação:
 * - Login
 * - Register
 * - Logout
 * - Get Current User
 * - Refresh Token
 */

import apiClient from '@/lib/apiClient';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '@/types/api.types';

// ==========================================
// CONSTANTS
// ==========================================

const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',
} as const;

// ==========================================
// LOCAL STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

// ==========================================
// SERVICE
// ==========================================

class AuthService {
  /**
   * Faz login do usuário
   */
  async login(credentials: LoginRequest): Promise<LoginResponse['data']> {
    try {
      console.log('🟢 authService.login - Enviando requisição:', AUTH_ENDPOINTS.LOGIN);
      console.log('🟢 authService.login - Credenciais:', { email: credentials.email, password: '***' });
      
      const response = await apiClient.post<LoginResponse>(
        AUTH_ENDPOINTS.LOGIN,
        credentials
      );

      console.log('🟢 authService.login - Resposta recebida:', response.data);

      // Backend retorna { success: true, data: { token, user } }
      const { token, user, refreshToken } = response.data.data;

      // Salva token e usuário no localStorage
      this.setToken(token);
      if (refreshToken) {
        this.setRefreshToken(refreshToken);
      }
      this.setUser(user);

      return response.data.data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  /**
   * Registra novo usuário
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>(
        AUTH_ENDPOINTS.REGISTER,
        data
      );

      return response.data;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    try {
      // Tenta fazer logout no backend (invalidar token)
      await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpa dados locais
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Busca dados do usuário autenticado
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ success: boolean; user: User }>(
        AUTH_ENDPOINTS.ME
      );

      const user = response.data.user;

      // Atualiza dados do usuário no localStorage
      this.setUser(user);

      return user;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza token usando refresh token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await apiClient.post<{ token: string }>(
        AUTH_ENDPOINTS.REFRESH,
        { refreshToken }
      );

      const { token } = response.data;

      // Salva novo token
      this.setToken(token);

      return token;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      // Se refresh falhar, faz logout
      this.clearAuth();
      throw error;
    }
  }

  // ==========================================
  // LOCAL STORAGE HELPERS
  // ==========================================

  /**
   * Salva token no localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * Busca token do localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Salva refresh token no localStorage
   */
  setRefreshToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  /**
   * Busca refresh token do localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Salva dados do usuário no localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /**
   * Busca dados do usuário do localStorage
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Limpa todos os dados de autenticação
   */
  clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Verifica se usuário tem uma role específica
   */
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Verifica se usuário tem uma das roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  }
}

// ==========================================
// EXPORT
// ==========================================

// Singleton instance
const authService = new AuthService();

export default authService;

/**
 * Exemplo de uso:
 * 
 * import authService from '@/services/auth.service';
 * 
 * // Login
 * const { token, user } = await authService.login({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * 
 * // Buscar usuário atual
 * const user = await authService.getCurrentUser();
 * 
 * // Verificar autenticação
 * if (authService.isAuthenticated()) {
 *   // Usuário logado
 * }
 * 
 * // Logout
 * await authService.logout();
 */
