/**
 * Educational Unit Repository
 * 
 * Camada de acesso ao banco de dados para unidades educacionais.
 * Responsável por todas as operações CRUD e queries relacionadas.
 */

import { supabaseAdmin } from '../config/supabase';
import { 
  EducationalUnit, 
  CreateEducationalUnitDTO, 
  UpdateEducationalUnitDTO,
  UserUnit 
} from '../types/unit.types';

export class EducationalUnitRepository {
  private readonly tableName = 'educational_units';
  private readonly userUnitsTable = 'user_units';

  /**
   * Lista todas as unidades educacionais
   * @returns Array de unidades
   */
  async findAll(): Promise<EducationalUnit[]> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao listar unidades: ${error.message}`);
    return data as EducationalUnit[];
  }

  /**
   * Lista unidades por IDs específicos
   * @param unitIds - Array de IDs de unidades
   * @returns Array de unidades
   */
  async findByIds(unitIds: string[]): Promise<EducationalUnit[]> {
    if (!unitIds || unitIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .in('id', unitIds)
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao buscar unidades: ${error.message}`);
    return data as EducationalUnit[];
  }

  /**
   * Busca unidade por ID
   * @param id - ID da unidade
   * @returns Unidade encontrada ou null
   */
  async findById(id: string): Promise<EducationalUnit | null> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as EducationalUnit;
  }

  /**
   * Cria uma nova unidade educacional
   * @param unitData - Dados da unidade
   * @returns Unidade criada
   */
  async create(unitData: CreateEducationalUnitDTO): Promise<EducationalUnit> {
    const insertData: any = {
      name: unitData.name,
      type: unitData.type,
      code: unitData.code,
      address: unitData.address,
      phone: unitData.phone,
      status: unitData.status || 'active',
    };

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Código da unidade já cadastrado');
      }
      throw new Error(`Erro ao criar unidade: ${error.message}`);
    }

    return data as EducationalUnit;
  }

  /**
   * Atualiza uma unidade educacional
   * @param id - ID da unidade
   * @param unitData - Dados a serem atualizados
   * @returns Unidade atualizada
   */
  async update(id: string, unitData: UpdateEducationalUnitDTO): Promise<EducationalUnit> {
    const updateData: any = {};
    
    if (unitData.name) updateData.name = unitData.name;
    if (unitData.type) updateData.type = unitData.type;
    if (unitData.code !== undefined) updateData.code = unitData.code;
    if (unitData.address !== undefined) updateData.address = unitData.address;
    if (unitData.phone !== undefined) updateData.phone = unitData.phone;
    if (unitData.status) updateData.status = unitData.status;

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      // @ts-expect-error - Supabase generic types limitation
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Código da unidade já cadastrado');
      }
      throw new Error(`Erro ao atualizar unidade: ${error.message}`);
    }

    if (!data) throw new Error('Unidade não encontrada');
    return data as EducationalUnit;
  }

  /**
   * Deleta uma unidade educacional
   * @param id - ID da unidade
   * @returns True se deletado com sucesso
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar unidade: ${error.message}`);
    return true;
  }

  /**
   * Busca as unidades de um usuário
   * @param userId - ID do usuário
   * @returns Array de unidades do usuário
   */
  async findUserUnits(userId: string): Promise<EducationalUnit[]> {
    const { data, error } = await supabaseAdmin
      .from(this.userUnitsTable)
      .select(`
        unit_id,
        educational_units (*)
      `)
      .eq('user_id', userId);

    if (error) throw new Error(`Erro ao buscar unidades do usuário: ${error.message}`);
    
    if (!data) return [];
    
    // Extrai apenas os dados da unidade
    return data
      .map((item: any) => item.educational_units)
      .filter((unit: any) => unit !== null) as EducationalUnit[];
  }

  /**
   * Vincula usuário a unidades
   * @param userId - ID do usuário
   * @param unitIds - Array de IDs de unidades
   * @returns Array de vínculos criados
   */
  async linkUserToUnits(userId: string, unitIds: string[]): Promise<UserUnit[]> {
    // Remove vínculos existentes
    await supabaseAdmin
      .from(this.userUnitsTable)
      .delete()
      .eq('user_id', userId);

    if (unitIds.length === 0) return [];

    // Cria novos vínculos
    const links: any[] = unitIds.map(unitId => ({
      user_id: userId,
      unit_id: unitId,
    }));

    const { data, error } = await supabaseAdmin
      .from(this.userUnitsTable)
      // @ts-expect-error - Supabase generic types limitation
      .insert(links)
      .select();

    if (error) throw new Error(`Erro ao vincular unidades: ${error.message}`);
    return data as UserUnit[];
  }

  /**
   * Remove vínculos de um usuário
   * @param userId - ID do usuário
   * @returns True se removido com sucesso
   */
  async unlinkUserFromAllUnits(userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from(this.userUnitsTable)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`Erro ao remover vínculos: ${error.message}`);
    return true;
  }

  /**
   * Conta quantos usuários estão vinculados a uma unidade
   * @param unitId - ID da unidade
   * @returns Quantidade de usuários
   */
  async countUsersInUnit(unitId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(this.userUnitsTable)
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId);

    if (error) throw new Error(`Erro ao contar usuários: ${error.message}`);
    return count || 0;
  }
}
