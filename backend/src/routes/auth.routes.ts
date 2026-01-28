/**
 * Rotas de Autenticação
 * 
 * Define todos os endpoints relacionados à autenticação.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authGuard } from '../middlewares/authGuard';
import { asyncHandler } from '../middlewares';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /auth/login
 * @desc    Login do usuário
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @route   GET /auth/me
 * @desc    Retorna dados do usuário autenticado
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/me', authGuard, asyncHandler(authController.me));

/**
 * @route   POST /auth/logout
 * @desc    Logout do usuário (informativo - JWT é stateless)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.post('/logout', authGuard, asyncHandler(authController.logout));

export default router;
