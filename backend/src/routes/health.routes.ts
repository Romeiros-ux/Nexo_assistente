/**
 * Rotas de Health Check
 * 
 * Define todos os endpoints relacionados ao monitoramento de saúde da API.
 */

import { Router } from 'express';
import {
  healthCheck,
  detailedHealthCheck,
  livenessCheck,
  readinessCheck,
} from '../controllers/health.controller';
import { asyncHandler } from '../middlewares';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check básico
 * @access  Public
 */
router.get('/', asyncHandler(healthCheck));

/**
 * @route   GET /health/detailed
 * @desc    Health check detalhado com status das dependências
 * @access  Public
 */
router.get('/detailed', asyncHandler(detailedHealthCheck));

/**
 * @route   GET /health/live
 * @desc    Liveness probe (Kubernetes)
 * @access  Public
 */
router.get('/live', asyncHandler(livenessCheck));

/**
 * @route   GET /health/ready
 * @desc    Readiness probe (Kubernetes)
 * @access  Public
 */
router.get('/ready', asyncHandler(readinessCheck));

export default router;
