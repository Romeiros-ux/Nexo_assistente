/**
 * Serviço de Unidades Educacionais
 * 
 * Gerencia operações relacionadas a unidades educacionais:
 * - Listar unidades
 * - Buscar por ID
 * - Buscar unidades de um usuário
 * - Criar unidade
 * - Atualizar unidade
 * - Deletar unidade
 */

import apiClient from '@/lib/apiClient';
import type {
  EducationalUnit,
  ApiSuccessResponse,
  PaginatedResponse,
} from '@/types/api.types';

// ==========================================
// TYPES
// ==========================================

export interface CreateUnitRequest {
  name: string;
  code?: string;
  type: 'SCHOOL' | 'CENTER' | 'DEPARTMENT' | 'SECRETARIAT';
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

export interface UpdateUnitRequest {
  name?: string;
  code?: string;
  type?: 'SCHOOL' | 'CENTER' | 'DEPARTMENT' | 'SECRETARIAT';
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
}

export interface UnitFilters {
  type?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
  search?: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const UNIT_ENDPOINTS = {
  BASE: '/educational-units',
  BY_ID: (id: string) => `/educational-units/${id}`,
  BY_USER: (userId: string) => `/users/${userId}/units`,
} as const;

// ==========================================
// SERVICE
// ==========================================

class UnitService {
  /**
   * Lista todas as unidades com filtros opcionais
   */
  async getAll(filters?: UnitFilters): Promise<EducationalUnit[]> {
    try {
      const params = filters || {};

      const response = await apiClient.get<PaginatedResponse<EducationalUnit>>(
        UNIT_ENDPOINTS.BASE,
        { params }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao listar unidades:', error);
      throw error;
    }
  }

  /**
   * Busca unidade por ID
   */
  async getById(id: string): Promise<EducationalUnit> {
    try {
      const response = await apiClient.get<ApiSuccessResponse<EducationalUnit>>(
        UNIT_ENDPOINTS.BY_ID(id)
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar unidade ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca apenas unidades ativas
   */
  async getActiveUnits(): Promise<EducationalUnit[]> {
    try {
      return await this.getAll({ status: 'ACTIVE' });
    } catch (error) {
      console.error('Erro ao buscar unidades ativas:', error);
      throw error;
    }
  }

  /**
   * Busca unidades vinculadas a um usuário
   */
  async getUnitsByUser(userId: string): Promise<EducationalUnit[]> {
    try {
      const response = await apiClient.get<ApiSuccessResponse<EducationalUnit[]>>(
        UNIT_ENDPOINTS.BY_USER(userId)
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar unidades do usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cria nova unidade (apenas TI)
   */
  async create(data: CreateUnitRequest): Promise<EducationalUnit> {
    try {
      const response = await apiClient.post<ApiSuccessResponse<EducationalUnit>>(
        UNIT_ENDPOINTS.BASE,
        data
      );

      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar unidade:', error);
      throw error;
    }
  }

  /**
   * Atualiza unidade existente (apenas TI)
   */
  async update(id: string, data: UpdateUnitRequest): Promise<EducationalUnit> {
    try {
      const response = await apiClient.put<ApiSuccessResponse<EducationalUnit>>(
        UNIT_ENDPOINTS.BY_ID(id),
        data
      );

      return response.data.data;
    } catch (error) {
      console.error(`Erro ao atualizar unidade ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deleta unidade (apenas TI)
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(UNIT_ENDPOINTS.BY_ID(id));
    } catch (error) {
      console.error(`Erro ao deletar unidade ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca por termo (nome ou código)
   */
  async search(term: string): Promise<EducationalUnit[]> {
    try {
      return await this.getAll({ search: term });
    } catch (error) {
      console.error(`Erro ao buscar unidades com termo "${term}":`, error);
      throw error;
    }
  }
}

// Exporta instância singleton
const unitService = new UnitService();
export default unitService;
