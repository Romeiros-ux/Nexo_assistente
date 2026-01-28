/**
 * Educational Unit Service
 * 
 * Camada de lógica de negócio para unidades educacionais.
 * Implementa regras de governança e controle de acesso.
 */

import { EducationalUnitRepository } from '../repositories/unit.repository';
import { 
  EducationalUnit, 
  CreateEducationalUnitDTO, 
  UpdateEducationalUnitDTO,
  LinkUserUnitsDTO,
  UnitType,
  UnitStatus
} from '../types/unit.types';
import { UserRole } from '../types/user.types';
import { ApiError } from '../middlewares/errorHandler';
import { z } from 'zod';

/**
 * Schema de validação para criar unidade
 */
const createUnitSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  type: z.nativeEnum(UnitType),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
});

/**
 * Schema de validação para atualizar unidade
 */
const updateUnitSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
  type: z.nativeEnum(UnitType).optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
});

/**
 * Schema de validação para vincular unidades
 */
const linkUnitsSchema = z.object({
  unit_ids: z.array(z.string().uuid('ID de unidade inválido')),
});

export class EducationalUnitService {
  private unitRepository: EducationalUnitRepository;

  constructor() {
    this.unitRepository = new EducationalUnitRepository();
  }

  /**
   * Lista unidades baseado no perfil do usuário
   * TI vê todas, demais apenas suas unidades
   * 
   * @param userId - ID do usuário fazendo a requisição
   * @param userRole - Role do usuário
   * @returns Array de unidades
   */
  async getUnitsForUser(userId: string, userRole: UserRole): Promise<EducationalUnit[]> {
    // TI vê todas as unidades
    if (userRole === UserRole.TI) {
      return this.unitRepository.findAll();
    }

    // Demais perfis veem apenas suas unidades
    return this.unitRepository.findUserUnits(userId);
  }

  /**
   * Busca unidade por ID
   * Verifica se o usuário tem acesso à unidade
   * 
   * @param unitId - ID da unidade
   * @param userId - ID do usuário
   * @param userRole - Role do usuário
   * @returns Unidade encontrada
   */
  async getUnitById(
    unitId: string, 
    userId: string, 
    userRole: UserRole
  ): Promise<EducationalUnit> {
    const unit = await this.unitRepository.findById(unitId);
    
    if (!unit) {
      throw new ApiError('Unidade não encontrada', 404);
    }

    // TI pode ver qualquer unidade
    if (userRole === UserRole.TI) {
      return unit;
    }

    // Verifica se o usuário tem acesso a esta unidade
    const userUnits = await this.unitRepository.findUserUnits(userId);
    const hasAccess = userUnits.some(u => u.id === unitId);

    if (!hasAccess) {
      throw new ApiError('Acesso negado a esta unidade', 403);
    }

    return unit;
  }

  /**
   * Cria uma nova unidade educacional
   * Apenas TI pode criar
   * 
   * @param unitData - Dados da unidade
   * @returns Unidade criada
   */
  async createUnit(unitData: CreateEducationalUnitDTO): Promise<EducationalUnit> {
    // Valida dados
    const validatedData = createUnitSchema.parse(unitData);

    // Cria unidade
    return this.unitRepository.create(validatedData as CreateEducationalUnitDTO);
  }

  /**
   * Atualiza uma unidade educacional
   * Apenas TI pode atualizar
   * 
   * @param unitId - ID da unidade
   * @param unitData - Dados a serem atualizados
   * @returns Unidade atualizada
   */
  async updateUnit(
    unitId: string, 
    unitData: UpdateEducationalUnitDTO
  ): Promise<EducationalUnit> {
    // Valida dados
    const validatedData = updateUnitSchema.parse(unitData);

    // Verifica se unidade existe
    const existingUnit = await this.unitRepository.findById(unitId);
    if (!existingUnit) {
      throw new ApiError('Unidade não encontrada', 404);
    }

    // Atualiza unidade
    return this.unitRepository.update(unitId, validatedData);
  }

  /**
   * Deleta uma unidade educacional
   * Apenas TI pode deletar
   * 
   * @param unitId - ID da unidade
   * @returns True se deletado
   */
  async deleteUnit(unitId: string): Promise<boolean> {
    // Verifica se unidade existe
    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new ApiError('Unidade não encontrada', 404);
    }

    // Verifica se há usuários vinculados
    const userCount = await this.unitRepository.countUsersInUnit(unitId);
    if (userCount > 0) {
      throw new ApiError(
        `Não é possível deletar. Há ${userCount} usuário(s) vinculado(s) a esta unidade`,
        400
      );
    }

    return this.unitRepository.delete(unitId);
  }

  /**
   * Vincula usuário a unidades
   * Apenas TI pode gerenciar vínculos
   * 
   * @param userId - ID do usuário
   * @param linkData - IDs das unidades
   * @returns Unidades vinculadas
   */
  async linkUserToUnits(
    userId: string, 
    linkData: LinkUserUnitsDTO
  ): Promise<EducationalUnit[]> {
    // Valida dados
    const validatedData = linkUnitsSchema.parse(linkData);

    // Verifica se todas as unidades existem
    const units = await this.unitRepository.findByIds(validatedData.unit_ids);
    
    if (units.length !== validatedData.unit_ids.length) {
      throw new ApiError('Uma ou mais unidades não foram encontradas', 404);
    }

    // Vincula usuário às unidades
    await this.unitRepository.linkUserToUnits(userId, validatedData.unit_ids);

    // Retorna as unidades vinculadas
    return units;
  }

  /**
   * Busca as unidades de um usuário
   * 
   * @param userId - ID do usuário
   * @param requestingUserId - ID do usuário fazendo a requisição
   * @param requestingUserRole - Role do usuário fazendo a requisição
   * @returns Array de unidades do usuário
   */
  async getUserUnits(
    userId: string,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<EducationalUnit[]> {
    // TI pode ver unidades de qualquer usuário
    // Outros perfis só podem ver suas próprias unidades
    if (requestingUserRole !== UserRole.TI && userId !== requestingUserId) {
      throw new ApiError('Acesso negado', 403);
    }

    return this.unitRepository.findUserUnits(userId);
  }

  /**
   * Verifica se o usuário tem acesso a unidades específicas
   * Útil para filtros futuros do assistente de IA
   * 
   * @param userId - ID do usuário
   * @param userRole - Role do usuário
   * @param unitIds - IDs das unidades a verificar (opcional)
   * @returns IDs das unidades que o usuário pode acessar
   */
  async getUserAccessibleUnitIds(
    userId: string, 
    userRole: UserRole,
    unitIds?: string[]
  ): Promise<string[]> {
    // TI tem acesso a tudo
    if (userRole === UserRole.TI) {
      if (unitIds && unitIds.length > 0) {
        return unitIds;
      }
      const allUnits = await this.unitRepository.findAll();
      return allUnits.map(u => u.id);
    }

    // Busca unidades do usuário
    const userUnits = await this.unitRepository.findUserUnits(userId);
    const userUnitIds = userUnits.map(u => u.id);

    // Se foram especificadas unidades, filtra apenas as que o usuário tem acesso
    if (unitIds && unitIds.length > 0) {
      return unitIds.filter(id => userUnitIds.includes(id));
    }

    return userUnitIds;
  }

  /**
   * Filtra dados baseado nas unidades do usuário
   * Método auxiliar para uso futuro pelo assistente de IA
   * 
   * @param userId - ID do usuário
   * @param userRole - Role do usuário
   * @returns Objeto com informações de filtro
   */
  async getUnitFilterForUser(userId: string, userRole: UserRole) {
    const unitIds = await this.getUserAccessibleUnitIds(userId, userRole);
    
    return {
      hasAccess: unitIds.length > 0 || userRole === UserRole.TI,
      unitIds,
      isAdmin: userRole === UserRole.TI,
      filterRequired: userRole !== UserRole.TI,
    };
  }
}
