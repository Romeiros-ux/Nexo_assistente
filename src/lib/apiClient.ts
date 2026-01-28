/**
 * Cliente HTTP Base
 * 
 * Configuração centralizada do axios com:
 * - BaseURL da API
 * - Interceptors para JWT
 * - Error handling
 * - Retry logic
 * - Type safety
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Instância do axios com configurações padrão
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// INTERCEPTORS - REQUEST
// ==========================================

/**
 * Adiciona JWT token automaticamente em todas as requisições
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// INTERCEPTORS - RESPONSE
// ==========================================

/**
 * Trata erros globalmente e tenta refresh token em caso de 401
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Retorna apenas os dados da resposta
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Se erro 401 e não é tentativa de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Tenta fazer refresh do token
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;

          // Salva novo token
          localStorage.setItem('auth_token', token);

          // Atualiza header da requisição original
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }

          // Tenta novamente a requisição original
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Se refresh falhar, faz logout
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Redireciona para login
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    // Se erro 403 (Forbidden), usuário não tem permissão
    if (error.response?.status === 403) {
      console.error('Acesso negado: você não tem permissão para esta ação');
    }

    return Promise.reject(error);
  }
);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Extrai mensagem de erro da resposta
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Erro da API
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    // Erro de rede
    if (error.message === 'Network Error') {
      return 'Erro de conexão. Verifique sua internet.';
    }
    
    // Timeout
    if (error.code === 'ECONNABORTED') {
      return 'A requisição demorou muito. Tente novamente.';
    }
    
    // Outros erros HTTP
    return error.message;
  }

  // Erro genérico
  return 'Ocorreu um erro inesperado';
};

/**
 * Verifica se é erro de autenticação
 */
export const isAuthError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401 || error.response?.status === 403;
  }
  return false;
};

/**
 * Verifica se é erro de validação
 */
export const isValidationError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 400;
  }
  return false;
};

// ==========================================
// EXPORT
// ==========================================

export default apiClient;

/**
 * Exemplo de uso:
 * 
 * import apiClient from '@/lib/apiClient';
 * 
 * // GET
 * const response = await apiClient.get('/users');
 * 
 * // POST
 * const response = await apiClient.post('/auth/login', {
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * 
 * // PUT
 * const response = await apiClient.put('/users/123', {
 *   name: 'New Name'
 * });
 * 
 * // DELETE
 * const response = await apiClient.delete('/users/123');
 */
