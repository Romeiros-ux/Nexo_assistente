/**
 * Rotas de Unidades Educacionais
 * 
 * Define todos os endpoints relacionados a unidades educacionais e vínculos.
 */

import { Router } from 'express';
import { EducationalUnitController } from '../controllers/unit.controller';
import { authGuard, adminGuard } from '../middlewares/authGuard';
import { asyncHandler } from '../middlewares';

const router = Router();
const unitController = new EducationalUnitController();

/**
 * @route   GET /educational-units
 * @desc    Lista unidades (TI vê todas, demais apenas suas unidades)
 * @access  Private (qualquer usuário autenticado)
 * @header  Authorization: Bearer <token>
 */
router.get('/', authGuard, asyncHandler(unitController.getAll));

/**
 * @route   GET /educational-units/filter/for-user
 * @desc    Retorna informações de filtro para o usuário (uso pelo assistente IA)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/filter/for-user', authGuard, asyncHandler(unitController.getFilterForUser));

/**
 * @route   GET /educational-units/:id
 * @desc    Busca unidade por ID (verifica acesso)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/:id', authGuard, asyncHandler(unitController.getById));

/**
 * @route   POST /educational-units
 * @desc    Cria nova unidade educacional
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 * @body    { name, type, code?, address?, phone?, status? }
 */
router.post('/', authGuard, adminGuard, asyncHandler(unitController.create));

/**
 * @route   PUT /educational-units/:id
 * @desc    Atualiza unidade educacional
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 * @body    { name?, type?, code?, address?, phone?, status? }
 */
router.put('/:id', authGuard, adminGuard, asyncHandler(unitController.update));

/**
 * @route   DELETE /educational-units/:id
 * @desc    Deleta unidade educacional
 * @access  Private (apenas TI)
 * @header  Authorization: Bearer <token>
 */
router.delete('/:id', authGuard, adminGuard, asyncHandler(unitController.delete));

export default router;
