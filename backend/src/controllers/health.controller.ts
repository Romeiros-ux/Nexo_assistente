/**
 * Controller de Health Check
 * 
 * Fornece endpoints para verificar o status da API e suas dependências.
 * Útil para monitoramento, load balancers e debugging.
 */

import { Request, Response } from 'express';
import { getDatabaseInfo } from '../config/supabase';
import { env } from '../config/env';

/**
 * Health Check Simples
 * Retorna status básico da API
 * 
 * @route GET /health
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API está funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
};

/**
 * Health Check Detalhado
 * Retorna status completo incluindo dependências
 * 
 * @route GET /health/detailed
 */
export const detailedHealthCheck = async (_req: Request, res: Response) => {
  const startTime = Date.now();

  // Verifica conexão com o banco de dados
  const databaseInfo = await getDatabaseInfo();

  const responseTime = Date.now() - startTime;

  // Determina o status geral
  const isHealthy = databaseInfo.connected;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: isHealthy,
    message: isHealthy ? 'Sistema operacional' : 'Sistema com problemas',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0', // TODO: Pegar do package.json
    responseTime: `${responseTime}ms`,
    services: {
      api: {
        status: 'operational',
        message: 'API funcionando corretamente',
      },
      database: {
        status: databaseInfo.connected ? 'operational' : 'down',
        message: databaseInfo.connected 
          ? 'Conexão com Supabase estabelecida' 
          : `Erro na conexão: ${databaseInfo.error}`,
        url: databaseInfo.url,
      },
    },
  });
};

/**
 * Endpoint de Liveness
 * Indica se a aplicação está viva (usado por Kubernetes)
 * 
 * @route GET /health/live
 */
export const livenessCheck = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'alive',
  });
};

/**
 * Endpoint de Readiness
 * Indica se a aplicação está pronta para receber tráfego
 * 
 * @route GET /health/ready
 */
export const readinessCheck = async (_req: Request, res: Response) => {
  const databaseInfo = await getDatabaseInfo();
  
  if (databaseInfo.connected) {
    res.status(200).json({
      success: true,
      status: 'ready',
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not ready',
      reason: 'Database connection failed',
    });
  }
};
