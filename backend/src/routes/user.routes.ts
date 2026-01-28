/**
 * Rotas de Usuários
 * 
 * Define todos os endpoints relacionados a usuários.
 * Todas as rotas requerem autenticação.
 * Rotas de criação, atualização e deleção requerem role TI (admin).
 */

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authGuard, adminGuard } from '../middlewares/authGuard';
import { asyncHandler } from '../middlewares';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /users
 * @desc    Lista todos os usuários
 * @access  Private (qualquer usuário autenticado)
 * @header  Authorization: Bearer <token>
 */
router.get('/', authGuard, asyncHandler(userController.getAll));

/**
 * @route   GET /users/:id
 * @desc    Busca usuário por ID
 * @access  Private (qualquer usuário autenticado)
 * @header  Authorization: Bearer <token>
 */
router.get('/:id', authGuard, asyncHandler(userController.getById));

/**
 * @route   POST /users
 * @desc    Cria um novo usuário
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 * @body    { name, email, password, role, status? }
 */
router.post('/', authGuard, adminGuard, asyncHandler(userController.create));

/**
 * @route   PUT /users/:id
 * @desc    Atualiza um usuário
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 * @body    { name?, email?, password?, role?, status? }
 */
router.put('/:id', authGuard, adminGuard, asyncHandler(userController.update));

/**
 * @route   DELETE /users/:id
 * @desc    Deleta um usuário
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 */
router.delete('/:id', authGuard, adminGuard, asyncHandler(userController.delete));

export default router;
