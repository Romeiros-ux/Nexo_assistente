/**
 * Rotas de Vínculos Usuário x Unidade
 * 
 * Define endpoints para gerenciar o relacionamento entre usuários e unidades.
 * Estas rotas são anexadas ao prefixo /users/:id/units
 */

import { Router } from 'express';
import { EducationalUnitController } from '../controllers/unit.controller';
import { authGuard, adminGuard } from '../middlewares/authGuard';
import { asyncHandler } from '../middlewares';

const router = Router({ mergeParams: true }); // Permite acessar :id do parent router
const unitController = new EducationalUnitController();

/**
 * @route   GET /users/:id/units
 * @desc    Lista unidades de um usuário
 * @access  Private (TI pode ver de qualquer usuário, outros apenas suas próprias)
 * @header  Authorization: Bearer <token>
 */
router.get('/', authGuard, asyncHandler(unitController.getUserUnits));

/**
 * @route   POST /users/:id/units
 * @desc    Vincula usuário a unidades
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 * @body    { unit_ids: string[] }
 */
router.post('/', authGuard, adminGuard, asyncHandler(unitController.linkUserToUnits));

export default router;
