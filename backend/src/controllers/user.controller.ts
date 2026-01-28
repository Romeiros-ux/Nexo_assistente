/**
 * User Controller
 * 
 * Controlador de usuários.
 * Responsável por receber requisições HTTP relacionadas a usuários,
 * validar entrada e chamar os services apropriados.
 */

import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDTO, UpdateUserDTO } from '../types/user.types';
import { ApiError } from '../middlewares/errorHandler';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * GET /users
   * Lista todos os usuários
   * Requer: authGuard
   */
  getAll = async (_req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();

    res.status(200).json({
      success: true,
      data: users,
      total: users.length,
    });
  };

  /**
   * GET /users/:id
   * Busca usuário por ID
   * Requer: authGuard
   */
  getById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await this.userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  };

  /**
   * POST /users
   * Cria um novo usuário
   * Requer: authGuard, adminGuard
   */
  create = async (req: Request, res: Response) => {
    const userData = req.body as CreateUserDTO;

    const user = await this.userService.createUser(userData);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: user,
    });
  };

  /**
   * PUT /users/:id
   * Atualiza um usuário
   * Requer: authGuard, adminGuard
   */
  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userData = req.body as UpdateUserDTO;

    const user = await this.userService.updateUser(id, userData);

    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: user,
    });
  };

  /**
   * DELETE /users/:id
   * Deleta um usuário
   * Requer: authGuard, adminGuard
   */
  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // req.user foi populado pelo authGuard
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    await this.userService.deleteUser(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Usuário deletado com sucesso',
    });
  };
}
