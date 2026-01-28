/**
 * Extensão dos tipos do Express
 * 
 * Adiciona propriedades customizadas aos tipos nativos do Express.
 * Útil para autenticação, usuário logado, etc.
 */

import { Request } from 'express';
import { UserRole } from './user.types';

/**
 * Estrutura do usuário autenticado
 * Será preenchido pelo middleware de autenticação JWT
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  // Adicione outros campos conforme necessário
}

/**
 * Extensão da interface Request do Express
 * Adiciona a propriedade 'user' para requisições autenticadas
 * Adiciona a propriedade 'file' para uploads via Multer
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      file?: Multer.File;
    }
  }
}

export {};
