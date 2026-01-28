/**
 * Auth Controller
 * 
 * Controlador de autenticação.
 * Responsável por receber requisições HTTP relacionadas à autenticação,
 * validar entrada e chamar os services apropriados.
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDTO } from '../types/user.types';
import { ApiError } from '../middlewares/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /auth/login
   * Realiza login do usuário
   */
  login = async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginDTO;

    // Validação básica
    if (!email || !password) {
      throw new ApiError('Email e senha são obrigatórios', 400);
    }

    // Realiza login
    const result = await this.authService.login({ email, password });

    res.status(200).json(result);
  };

  /**
   * GET /auth/me
   * Retorna dados do usuário autenticado
   * Requer: authGuard middleware
   */
  me = async (req: Request, res: Response) => {
    // req.user foi populado pelo authGuard
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    // Busca dados completos do usuário
    const user = await this.authService.getAuthenticatedUser(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  };

  /**
   * POST /auth/logout
   * Logout do usuário (opcional - JWT é stateless)
   * No frontend, basta remover o token
   */
  logout = async (_req: Request, res: Response) => {
    // Com JWT stateless, o logout é feito no cliente
    // Este endpoint é apenas informativo
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso. Token deve ser removido no cliente.',
    });
  };
}
