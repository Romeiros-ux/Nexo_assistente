/**
 * Middleware de Tratamento de Erros
 * 
 * Captura e formata erros de forma consistente em toda a aplicação.
 * Garante que erros sejam tratados adequadamente e não vazem informações sensíveis.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Interface para erros customizados da aplicação
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Classe para criar erros operacionais
 * Erros operacionais são esperados e podem ser mostrados ao usuário
 */
export class ApiError extends Error implements AppError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware global de tratamento de erros
 * Deve ser o último middleware registrado no Express
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Define valores padrão caso não estejam definidos
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== undefined ? err.isOperational : false;

  // Log do erro (em produção, isso deveria ir para um serviço de logs)
  if (env.NODE_ENV === 'development') {
    console.error('❌ Erro capturado:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      isOperational,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('❌ Erro:', err.message);
  }

  // Prepara a resposta de erro
  const errorResponse = {
    success: false,
    error: isOperational ? err.message : 'Erro interno do servidor',
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: {
        path: req.path,
        method: req.method,
        statusCode,
      },
    }),
  };

  // Envia resposta ao cliente
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar rotas não encontradas
 * Deve ser registrado antes do errorHandler
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new ApiError(`Rota não encontrada: ${req.method} ${req.path}`, 404);
  next(error);
};

/**
 * Wrapper para async handlers
 * Evita repetição de try-catch em cada controller
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
