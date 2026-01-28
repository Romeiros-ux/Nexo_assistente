/**
 * User Repository
 * 
 * Camada de acesso ao banco de dados para usuários.
 * Responsável por todas as operações CRUD diretas no Supabase.
 * Utiliza o cliente admin para bypass de RLS (Row Level Security).
 */

import { supabaseAdmin, Database } from '../config/supabase';
import { User, CreateUserDTO, UpdateUserDTO, UserPublic } from '../types/user.types';

export class UserRepository {
  private readonly tableName = 'users';

  /**
   * Busca usuário por email
   * @param email - Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) return null;
    return data as User;
  }

  /**
   * Busca usuário por ID
   * @param id - ID do usuário
   * @returns Usuário encontrado ou null
   */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as User;
  }

  /**
   * Lista todos os usuários
   * @returns Array de usuários (sem senha)
   */
  async findAll(): Promise<UserPublic[]> {
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('id, name, email, role, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);
    return data as UserPublic[];
  }

  /**
   * Cria um novo usuário
   * @param userData - Dados do usuário a ser criado
   * @returns Usuário criado (sem senha)
   */
  async create(userData: CreateUserDTO): Promise<UserPublic> {
    const insertData: Database['public']['Tables']['users']['Insert'] = {
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password, // Já deve vir hasheado do service
      role: userData.role as any,
      status: userData.status || 'active',
    };

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .insert(insertData as any)
      .select('id, name, email, role, status, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email já cadastrado');
      }
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    return data as UserPublic;
  }

  /**
   * Atualiza um usuário existente
   * @param id - ID do usuário
   * @param userData - Dados a serem atualizados
   * @returns Usuário atualizado (sem senha)
   */
  async update(id: string, userData: UpdateUserDTO): Promise<UserPublic> {
    const updateData: any = {};

    if (userData.name) updateData.name = userData.name;
    if (userData.email) updateData.email = userData.email.toLowerCase();
    if (userData.password) updateData.password = userData.password; // Já hasheado
    if (userData.role) updateData.role = userData.role;
    if (userData.status) updateData.status = userData.status;

    const { data, error} = await supabaseAdmin
      .from(this.tableName)
      // @ts-expect-error - Supabase generic types limitation
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, status, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Email já cadastrado');
      }
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }

    if (!data) throw new Error('Usuário não encontrado');
    return data as UserPublic;
  }

  /**
   * Deleta um usuário
   * @param id - ID do usuário a ser deletado
   * @returns True se deletado com sucesso
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar usuário: ${error.message}`);
    return true;
  }

  /**
   * Verifica se um email já está cadastrado
   * @param email - Email a ser verificado
   * @param excludeId - ID a ser excluído da verificação (para updates)
   * @returns True se o email existe
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = supabaseAdmin
      .from(this.tableName)
      .select('id')
      .eq('email', email.toLowerCase());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return data !== null && data.length > 0;
  }
}
