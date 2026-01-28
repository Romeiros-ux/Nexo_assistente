/**
 * Auth Service
 * 
 * Camada de lógica de negócio para autenticação.
 * Responsável por:
 * - Hash de senhas com bcrypt
 * - Geração e verificação de JWT
 * - Validação de credenciais
 * - Regras de negócio de autenticação
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { 
  LoginDTO, 
  LoginResponse, 
  JWTPayload, 
  User,
  UserPublic 
} from '../types/user.types';
import { ApiError } from '../middlewares/errorHandler';

export class AuthService {
  private userRepository: UserRepository;
  private readonly saltRounds = 10;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Realiza o login do usuário
   * @param credentials - Email e senha
   * @returns Token JWT e dados do usuário
   */
  async login(credentials: LoginDTO): Promise<LoginResponse> {
    // Busca usuário por email
    const user = await this.userRepository.findByEmail(credentials.email);
    
    if (!user) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    // Verifica se o usuário está ativo
    if (user.status !== 'active') {
      throw new ApiError('Usuário inativo ou suspenso', 403);
    }

    // Valida senha
    const isPasswordValid = await this.verifyPassword(
      credentials.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    // Gera token JWT
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove senha do retorno
    const userPublic = this.sanitizeUser(user);

    return {
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        expiresIn: '7d',
        user: userPublic,
      },
    };
  }

  /**
   * Valida e retorna dados do usuário autenticado
   * @param userId - ID do usuário
   * @returns Dados do usuário
   */
  async getAuthenticatedUser(userId: string): Promise<UserPublic> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    if (user.status !== 'active') {
      throw new ApiError('Usuário inativo ou suspenso', 403);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Gera hash bcrypt da senha
   * @param password - Senha em texto plano
   * @returns Hash da senha
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verifica se a senha corresponde ao hash
   * @param password - Senha em texto plano
   * @param hash - Hash armazenado
   * @returns True se a senha é válida
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Gera token JWT
   * @param payload - Dados a serem incluídos no token
   * @returns Token JWT
   */
  generateToken(payload: JWTPayload): string {
    // @ts-ignore - JWT types issue with expiresIn
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  /**
   * Verifica e decodifica token JWT
   * @param token - Token JWT
   * @returns Payload decodificado
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new ApiError('Token inválido ou expirado', 401);
    }
  }

  /**
   * Remove informações sensíveis do usuário
   * @param user - Usuário completo
   * @returns Usuário sem senha
   */
  private sanitizeUser(user: User): UserPublic {
    const { password, ...userPublic } = user;
    return userPublic;
  }
}
