/**
 * Configuração da Aplicação Express
 * 
 * Este arquivo configura o Express e todos os middlewares necessários.
 * Mantém a lógica de configuração separada da inicialização do servidor.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger, errorHandler, notFoundHandler } from './middlewares';
import routes from './routes';

/**
 * Cria e configura a aplicação Express
 */
export function createApp(): Application {
  const app = express();

  // ==========================================
  // MIDDLEWARES DE SEGURANÇA
  // ==========================================

  /**
   * Helmet: Protege a aplicação configurando vários headers HTTP
   * - Previne ataques XSS, clickjacking, etc.
   */
  app.use(helmet());

  /**
   * CORS: Controla o acesso cross-origin
   * - Modo permissivo para desenvolvimento
   */
  app.use(cors({
    origin: true, // Permite todas as origens em dev
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ==========================================
  // MIDDLEWARES DE PARSING
  // ==========================================

  /**
   * Body Parser: Converte o corpo das requisições
   */
  app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

  // ==========================================
  // MIDDLEWARES DE LOGGING
  // ==========================================

  /**
   * Morgan: Registra todas as requisições HTTP
   */
  app.use(logger);

  // ==========================================
  // ROTAS
  // ==========================================

  /**
   * Health Check direto (sem API_PREFIX) - Para debug
   */
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Registra todas as rotas da API
   */
  app.use(env.API_PREFIX, routes);

  /**
   * Rota raiz - Informações básicas da API
   */
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Assistente Institucional Inteligente - API',
      version: '1.0.0',
      apiPrefix: env.API_PREFIX,
      documentation: `${env.API_PREFIX}/docs`,
    });
  });

  // ==========================================
  // MIDDLEWARES DE ERRO
  // ==========================================

  /**
   * Handler para rotas não encontradas
   * Deve vir ANTES do errorHandler
   */
  app.use(notFoundHandler);

  /**
   * Handler global de erros
   * Deve ser o ÚLTIMO middleware
   */
  app.use(errorHandler);

  return app;
}
