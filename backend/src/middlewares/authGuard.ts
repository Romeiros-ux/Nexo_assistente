/**
 * Authentication Guards
 * 
 * Middlewares de proteção de rotas.
 * - authGuard: Verifica se o usuário está autenticado
 * - adminGuard: Verifica se o usuário é admin (role TI)
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiError } from './errorHandler';
import { UserRole } from '../types/user.types';

const authService = new AuthService();

/**
 * Middleware de Autenticação
 * 
 * Verifica se há um token JWT válido no header Authorization.
 * Se válido, adiciona os dados do usuário em req.user
 * 
 * @usage app.get('/protected', authGuard, controller)
 */
export const authGuard = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new ApiError('Token não fornecido', 401);
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError('Formato de token inválido', 401);
    }

    const token = parts[1];

    // Verifica e decodifica o token
    const payload = authService.verifyToken(token);

    // Busca dados atualizados do usuário
    const user = await authService.getAuthenticatedUser(payload.id);

    // Adiciona usuário na requisição
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError('Token inválido ou expirado', 401));
    }
  }
};

/**
 * Middleware de Autorização - Admin (TI)
 * 
 * Verifica se o usuário autenticado possui role TI.
 * DEVE ser usado DEPOIS do authGuard.
 * 
 * @usage app.delete('/users/:id', authGuard, adminGuard, controller)
 */
export const adminGuard = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Verifica se authGuard foi executado antes
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    // Verifica se é admin (TI)
    if (req.user.role !== UserRole.TI) {
      throw new ApiError('Acesso negado. Apenas administradores (TI) podem acessar', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de Autorização - Roles Customizadas
 * 
 * Factory function que retorna um middleware que verifica
 * se o usuário possui uma das roles permitidas.
 * 
 * @param allowedRoles - Array de roles permitidas
 * @returns Middleware de verificação
 * 
 * @example
 * app.get('/reports', authGuard, roleGuard(['TI', 'Diretor']), controller)
 */
export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError('Usuário não autenticado', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(
          `Acesso negado. Requer uma das seguintes permissões: ${allowedRoles.join(', ')}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
