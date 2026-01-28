/**
 * Document Routes
 * 
 * Define endpoints para gerenciamento de documentos
 * Todos os endpoints requerem autenticação
 * Upload/Ativação/Desativação/Deleção requerem perfil TI ou COMISSAO
 */

import { Router } from 'express';
import documentController from '../controllers/document.controller';
import { authGuard } from '../middlewares/authGuard';
import { uploadMiddleware } from '../middlewares/upload.middleware';

// ==========================================
// ROUTER INSTANCE
// ==========================================

const router = Router();

// ==========================================
// GUARDS CUSTOMIZADOS
// ==========================================

/**
 * Guard para TI ou COMISSÃO
 * Permite acesso a membros da comissão ou TI
 */
const comissaoOrAdminGuard = (req: any, res: any, next: any) => {
  const userRole = req.user?.role?.toUpperCase();
  
  if (userRole === 'TI' || userRole === 'SECRETARIA' || userRole === 'COMISSAO') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Somente membros da Comissão ou TI podem realizar esta ação.'
  });
};

/**
 * Guard SOMENTE para TI
 * Ações críticas (ativar/desativar/excluir)
 */
const tiOnlyGuard = (req: any, res: any, next: any) => {
  const userRole = req.user?.role?.toUpperCase();
  
  if (userRole === 'TI' || userRole === 'SECRETARIA') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Somente TI pode realizar esta ação.'
  });
};

// ==========================================
// ROUTES
// ==========================================

/**
 * POST /api/v1/documents/upload
 * Upload de documento
 * Acesso: TI + COMISSAO
 */
router.post(
  '/upload',
  authGuard,
  comissaoOrAdminGuard,
  uploadMiddleware.single('file'),
  documentController.upload.bind(documentController)
);

/**
 * GET /api/v1/documents
 * Lista todos os documentos (com filtros opcionais)
 * Query params: ?document_type=NORM&status=ACTIVE&is_public=true&search=lei
 * Acesso: Todos autenticados
 */
router.get(
  '/',
  authGuard,
  documentController.getAll.bind(documentController)
);

/**
 * GET /api/v1/documents/active
 * Lista apenas documentos ativos
 * Acesso: Todos autenticados
 */
router.get(
  '/active',
  authGuard,
  documentController.getActive.bind(documentController)
);

/**
 * GET /api/v1/documents/public
 * Lista documentos públicos
 * Acesso: Todos autenticados
 */
router.get(
  '/public',
  authGuard,
  documentController.getPublic.bind(documentController)
);

/**
 * GET /api/v1/documents/:id
 * Busca documento por ID
 * Acesso: Todos autenticados
 */
router.get(
  '/:id',
  authGuard,
  documentController.getById.bind(documentController)
);

/**
 * GET /api/v1/documents/:id/download
 * Gera URL temporária para download
 * Acesso: Todos autenticados
 */
router.get(
  '/:id/download',
  authGuard,
  documentController.getDownloadUrl.bind(documentController)
);

/**
 * PUT /api/v1/documents/:id
 * Atualiza metadados do documento
 * Acesso: TI + COMISSAO
 */
router.put(
  '/:id',
  authGuard,
  comissaoOrAdminGuard,
  documentController.update.bind(documentController)
);

/**
 * PATCH /api/v1/documents/:id/activate
 * Ativa documento (PENDING → ACTIVE)
 * Acesso: SOMENTE TI
 */
router.patch(
  '/:id/activate',
  authGuard,
  tiOnlyGuard,
  documentController.activate.bind(documentController)
);

/**
 * PATCH /api/v1/documents/:id/deactivate
 * Desativa documento (ACTIVE → INACTIVE)
 * Acesso: SOMENTE TI
 */
router.patch(
  '/:id/deactivate',
  authGuard,
  tiOnlyGuard,
  documentController.deactivate.bind(documentController)
);

/**
 * POST /api/v1/documents/:id/reindex
 * Reprocessa documento (gera embeddings/chunks)
 * Acesso: SOMENTE TI
 */
router.post(
  '/:id/reindex',
  authGuard,
  tiOnlyGuard,
  documentController.reindex.bind(documentController)
);

/**
 * DELETE /api/v1/documents/:id
 * "Exclui" documento (soft delete: ARCHIVED)
 * Acesso: SOMENTE TI
 */
router.delete(
  '/:id',
  authGuard,
  tiOnlyGuard,
  documentController.delete.bind(documentController)
);

// ==========================================
// EXPORT
// ==========================================

export default router;
