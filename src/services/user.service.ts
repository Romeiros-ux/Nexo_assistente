/**
 * Serviço de Usuários
 * 
 * Gerencia operações CRUD de usuários:
 * - Listar usuários
 * - Buscar por ID
 * - Criar usuário
 * - Atualizar usuário
 * - Deletar usuário
 * - Ativar/Desativar usuário
 */

import apiClient from '@/lib/apiClient';
import type {
  User,
  UserRole,
  UserWithUnits,
  UserFilters,
  PaginationParams,
  PaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

// ==========================================
// TYPES
// ==========================================

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'TI' | 'SECRETARIA' | 'DIRETOR' | 'COORDENACAO' | 'COMISSAO';
  phone?: string;
  department?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'TI' | 'SECRETARIA' | 'DIRETOR' | 'COORDENACAO' | 'COMISSAO';
  phone?: string;
  department?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
}

// ==========================================
// CONSTANTS
// ==========================================

const USER_ENDPOINTS = {
  BASE: '/users',
  BY_ID: (id: string) => `/users/${id}`,
  TOGGLE_STATUS: (id: string) => `/users/${id}/toggle-status`,
} as const;

// ==========================================
// SERVICE
// ==========================================

class UserService {
  /**
   * Lista todos os usuários com filtros e paginação
   */
  async getAll(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<User>> {
    try {
      const params = {
        ...filters,
        ...pagination,
      };

      const response = await apiClient.get<PaginatedResponse<User>>(
        USER_ENDPOINTS.BASE,
        { params }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  /**
   * Busca usuário por ID
   */
  async getById(id: string): Promise<UserWithUnits> {
    try {
      const response = await apiClient.get<ApiSuccessResponse<UserWithUnits>>(
        USER_ENDPOINTS.BY_ID(id)
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cria novo usuário
   */
  async create(data: CreateUserRequest): Promise<User> {
    try {
      const response = await apiClient.post<ApiSuccessResponse<User>>(
        USER_ENDPOINTS.BASE,
        data
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza usuário existente
   */
  async update(id: string, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiClient.put<ApiSuccessResponse<User>>(
        USER_ENDPOINTS.BY_ID(id),
        data
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deleta usuário
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(USER_ENDPOINTS.BY_ID(id));
    } catch (error) {
      console.error(`Erro ao deletar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Ativa ou desativa usuário
   */
  async toggleStatus(id: string): Promise<User> {
    try {
      const response = await apiClient.patch<ApiSuccessResponse<User>>(
        USER_ENDPOINTS.TOGGLE_STATUS(id)
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao alternar status do usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca usuários por role
   */
  async getByRole(role: UserRole): Promise<User[]> {
    try {
      const response = await this.getAll({ role });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar usuários com role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Busca usuários ativos
   */
  async getActive(): Promise<User[]> {
    try {
      const response = await this.getAll({ is_active: true });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários ativos:', error);
      throw error;
    }
  }

  /**
   * Busca por termo (nome ou email)
   */
  async search(term: string): Promise<User[]> {
    try {
      const response = await this.getAll({ search: term });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar usuários com termo "${term}":`, error);
      throw error;
    }
  }

  /**
   * Vincula usuário a múltiplas unidades (apenas TI)
   */
  async assignUnitsToUser(userId: string, unitIds: string[]): Promise<void> {
    try {
      await apiClient.post<ApiSuccessResponse<void>>(
        `/users/${userId}/units`,
        { unit_ids: unitIds }
      );
    } catch (error) {
      console.error(`Erro ao vincular unidades ao usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove vínculo de usuário com uma unidade (apenas TI)
   */
  async removeUnitFromUser(userId: string, unitId: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}/units/${unitId}`);
    } catch (error) {
      console.error(`Erro ao desvincular unidade ${unitId} do usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Busca usuário com unidades vinculadas
   */
  async getUserWithUnits(userId: string): Promise<UserWithUnits> {
    try {
      const response = await apiClient.get<ApiSuccessResponse<UserWithUnits>>(
        USER_ENDPOINTS.BY_ID(userId)
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar usuário ${userId} com unidades:`, error);
      throw error;
    }
  }
}

// ==========================================
// EXPORT
// ==========================================

// Singleton instance
const userService = new UserService();

export default userService;

/**
 * Exemplo de uso:
 * 
 * import userService from '@/services/user.service';
 * 
 * // Listar todos os usuários
 * const { data, pagination } = await userService.getAll();
 * 
 * // Listar com filtros
 * const { data } = await userService.getAll(
 *   { role: 'diretor_escola', is_active: true },
 *   { page: 1, limit: 10 }
 * );
 * 
 * // Buscar por ID
 * const user = await userService.getById('123');
 * 
 * // Criar
 * const newUser = await userService.create({
 *   name: 'João Silva',
 *   email: 'joao@example.com',
 *   password: 'senha123',
 *   role: 'diretor_escola'
 * });
 * 
 * // Atualizar
 * const updated = await userService.update('123', {
 *   name: 'João Silva Atualizado'
 * });
 * 
 * // Deletar
 * await userService.delete('123');
 * 
 * // Buscar por role
 * const diretores = await userService.getByRole('diretor_escola');
 */
