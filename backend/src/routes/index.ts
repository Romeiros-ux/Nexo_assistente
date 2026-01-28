/**
 * Agregador de Rotas
 * 
 * Centraliza todas as rotas da aplicação e as organiza por versão da API.
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import unitRoutes from './unit.routes';
import userUnitRoutes from './user-unit.routes';
import documentRoutes from './document.routes';
import indexingRoutes from './indexing.routes';
import searchRoutes from './search.routes';
import jobsRoutes from './jobs.routes';

// Importar chat routes com tratamento de erro
let chatRoutes: Router;
try {
  chatRoutes = require('./chat.routes').default;
  console.log('✅ [Routes] Chat routes importadas com sucesso');
} catch (error) {
  console.error('❌ [Routes] ERRO ao importar chat routes:', error);
  // Criar router vazio para não quebrar a aplicação
  chatRoutes = Router();
  chatRoutes.all('*', (_req, res) => {
    res.status(503).json({
      success: false,
      error: 'Chat temporariamente indisponível - Erro de inicialização',
    });
  });
}

const router = Router();

/**
 * Rotas de Health Check
 * Não versionadas - sempre acessíveis diretamente
 */
router.use('/health', healthRoutes);

/**
 * Rotas de Autenticação
 * Públicas e privadas
 */
router.use('/auth', authRoutes);

/**
 * Rotas de Usuários
 * Requerem autenticação
 * Inclui sub-rotas para vínculos com unidades
 */
router.use('/users/:id/units', userUnitRoutes);
router.use('/users', userRoutes);

/**
 * Rotas de Unidades Educacionais
 * Requerem autenticação
 * Acesso baseado em governança (TI vê tudo, demais apenas suas unidades)
 */
router.use('/educational-units', unitRoutes);

/**
 * Rotas de Documentos
 * Requerem autenticação
 * Upload/Ativação/Desativação/Deleção: TI + COMISSAO
 */
router.use('/documents', documentRoutes);

/**
 * Rotas de Indexação (FASE 2)
 * Requerem autenticação
 * Forçar indexação e batch: TI apenas
 * Consultas: Todos autenticados
 */
router.use('/indexing', indexingRoutes);

/**
 * Rotas de Busca Semântica (FASE 2)
 * Requerem autenticação
 * Busca aplica filtros de governança automaticamente
 * Estatísticas: TI apenas
 */
router.use('/search', searchRoutes);

/**
 * Rotas de Chat Conversacional (FASE 3)
 * Requerem autenticação
 * Perfis permitidos: DIRETOR, COMISSAO, SECRETARIA, TI
 * Estatísticas: TI apenas
 */
router.use('/chat', chatRoutes);

/**
 * Rotas de Jobs de Indexação (FASE 2.5)
 * Requerem autenticação
 * Monitoramento de background jobs (Bull/Redis)
 */
router.use('/jobs', jobsRoutes);

/**
 * Rotas versionadas da API v1 (futuras)
 * Adicione aqui as futuras rotas: /api/v1/...
 */
// router.use('/conversations', conversationRoutes);
// router.use('/messages', messageRoutes);

/**
 * Rota raiz da API
 * Fornece informações básicas sobre a API
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'API do Assistente Institucional Inteligente',
    version: '1.0.0',
    documentation: '/api/v1/docs', // TODO: Implementar Swagger
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /auth/login',
        me: 'GET /auth/me',
        logout: 'POST /auth/logout',
      },
      users: {
        list: 'GET /users',
        get: 'GET /users/:id',
        create: 'POST /users',
        update: 'PUT /users/:id',
        delete: 'DELETE /users/:id',
        units: 'GET /users/:id/units',
        linkUnits: 'POST /users/:id/units',
      },
      educationalUnits: {
        list: 'GET /educational-units',
        get: 'GET /educational-units/:id',
        create: 'POST /educational-units',
        update: 'PUT /educational-units/:id',
        delete: 'DELETE /educational-units/:id',
        filter: 'GET /educational-units/filter/for-user',
      },
      documents: {
        upload: 'POST /documents/upload',
        list: 'GET /documents',
        listActive: 'GET /documents/active',
        listPublic: 'GET /documents/public',
        get: 'GET /documents/:id',
        download: 'GET /documents/:id/download',
        update: 'PUT /documents/:id',
        activate: 'PATCH /documents/:id/activate',
        deactivate: 'PATCH /documents/:id/deactivate',
        delete: 'DELETE /documents/:id',
      },
      indexing: {
        forceIndex: 'POST /indexing/version/:id',
        processPending: 'POST /indexing/process-pending',
        documentStatus: 'GET /indexing/document/:id/status',
        stats: 'GET /indexing/stats',
      },
      search: {
        semantic: 'POST /search/semantic',
        history: 'GET /search/history',
        popular: 'GET /search/popular',
        stats: 'GET /search/stats',
        documentChunks: 'GET /search/document/:id/chunks',
      },
      chat: {
        ask: 'POST /chat/ask',
        history: 'GET /chat/history',
        stats: 'GET /chat/stats',
        popular: 'GET /chat/popular',
        mostCitedDocuments: 'GET /chat/documents/most-cited',
      },
      jobs: {
        stats: 'GET /jobs/stats',
        recent: 'GET /jobs/recent',
        failed: 'GET /jobs/failed',
        get: 'GET /jobs/:jobId',
        retry: 'POST /jobs/:jobId/retry',
        pause: 'POST /jobs/pause',
        resume: 'POST /jobs/resume',
        clean: 'DELETE /jobs/clean',
      },
    },
  });
});

export default router;
