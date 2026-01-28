/**
 * Tipos e Interfaces relacionados a Usuários
 */

/**
 * Roles disponíveis no sistema
 */
export enum UserRole {
  TI = 'TI',
  COMISSAO = 'Comissão',
  DIRETOR = 'Diretor',
  COORDENACAO = 'Coordenação',
  SECRETARIA = 'Secretaria de Educação',
}

/**
 * Status possíveis do usuário
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Interface do Usuário (modelo completo)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Hash bcrypt
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Usuário sem informações sensíveis (para retornar ao cliente)
 */
export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payload do JWT
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Dados para criar um usuário
 */
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

/**
 * Dados para atualizar um usuário
 */
export interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Credenciais de login
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * Resposta de login
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    expiresIn: string;
    user: UserPublic;
  };
}
