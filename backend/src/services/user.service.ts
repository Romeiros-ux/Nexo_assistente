/**
 * User Service
 * 
 * Camada de lógica de negócio para usuários.
 * Responsável por:
 * - Validação de dados
 * - Regras de negócio de usuários
 * - Orquestração entre repository e auth service
 */

import { UserRepository } from '../repositories/user.repository';
import { AuthService } from './auth.service';
import { 
  CreateUserDTO, 
  UpdateUserDTO, 
  UserPublic,
  UserRole,
  UserStatus
} from '../types/user.types';
import { ApiError } from '../middlewares/errorHandler';
import { z } from 'zod';

/**
 * Schema de validação para criação de usuário
 */
const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus).optional(),
});

/**
 * Schema de validação para atualização de usuário
 */
const updateUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export class UserService {
  private userRepository: UserRepository;
  private authService: AuthService;

  constructor() {
    this.userRepository = new UserRepository();
    this.authService = new AuthService();
  }

  /**
   * Lista todos os usuários
   * @returns Array de usuários
   */
  async getAllUsers(): Promise<UserPublic[]> {
    return this.userRepository.findAll();
  }

  /**
   * Busca usuário por ID
   * @param id - ID do usuário
   * @returns Usuário encontrado
   */
  async getUserById(id: string): Promise<UserPublic> {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    const { password, ...userPublic } = user;
    return userPublic;
  }

  /**
   * Cria um novo usuário
   * @param userData - Dados do usuário
   * @returns Usuário criado
   */
  async createUser(userData: CreateUserDTO): Promise<UserPublic> {
    // Valida dados de entrada
    const validatedData = createUserSchema.parse(userData);

    // Verifica se email já existe
    const emailExists = await this.userRepository.emailExists(validatedData.email);
    if (emailExists) {
      throw new ApiError('Email já cadastrado', 409);
    }

    // Hash da senha
    const hashedPassword = await this.authService.hashPassword(validatedData.password);

    // Cria usuário
    return this.userRepository.create({
      ...validatedData,
      password: hashedPassword,
    });
  }

  /**
   * Atualiza um usuário
   * @param id - ID do usuário
   * @param userData - Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async updateUser(id: string, userData: UpdateUserDTO): Promise<UserPublic> {
    // Valida dados de entrada
    const validatedData = updateUserSchema.parse(userData);

    // Verifica se usuário existe
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    // Se estiver atualizando email, verifica duplicidade
    if (validatedData.email) {
      const emailExists = await this.userRepository.emailExists(
        validatedData.email,
        id
      );
      if (emailExists) {
        throw new ApiError('Email já cadastrado', 409);
      }
    }

    // Hash da nova senha se fornecida
    if (validatedData.password) {
      validatedData.password = await this.authService.hashPassword(
        validatedData.password
      );
    }

    // Atualiza usuário
    return this.userRepository.update(id, validatedData);
  }

  /**
   * Deleta um usuário
   * @param id - ID do usuário
   * @param requestingUserId - ID do usuário que está fazendo a requisição
   * @returns True se deletado com sucesso
   */
  async deleteUser(id: string, requestingUserId: string): Promise<boolean> {
    // Não permite deletar a si mesmo
    if (id === requestingUserId) {
      throw new ApiError('Não é possível deletar seu próprio usuário', 400);
    }

    // Verifica se usuário existe
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    // Deleta usuário
    return this.userRepository.delete(id);
  }
}
