/**
 * Document Controller
 * 
 * Controla requisições HTTP relacionadas a documentos
 * - Upload
 * - Listagem
 * - Download
 * - Ativação/Desativação
 * - Deleção (soft delete)
 */

import { Request, Response } from 'express';
import documentService, { CreateDocumentRequest, UpdateDocumentRequest, DocumentFilters } from '../services/document.service';

// ==========================================
// DOCUMENT CONTROLLER
// ==========================================

class DocumentController {
  /**
   * POST /api/v1/documents/upload
   * Faz upload de documento ou cadastra URL
   */
  async upload(req: Request, res: Response): Promise<Response> {
    try {
      // Extrai metadados do body
      const metadata: CreateDocumentRequest = {
        name: req.body.name,
        description: req.body.description,
        document_type: req.body.document_type,
        official_number: req.body.official_number,
        publication_date: req.body.publication_date,
        effective_date: req.body.effective_date,
        is_public: req.body.is_public === 'true' || req.body.is_public === true,
        requires_authorization: req.body.requires_authorization === 'true' || req.body.requires_authorization === true,
        // Novos campos para URLs
        source_url: req.body.source_url,
        is_url: req.body.is_url === 'true' || req.body.is_url === true,
        // Novos campos de estruturação
        domain: req.body.domain,
        subdomain: req.body.subdomain,
        metadata_year: req.body.metadata_year ? parseInt(req.body.metadata_year) : undefined,
        unit_name: req.body.unit_name,
        unit_id: req.body.unit_id,
        document_version: req.body.document_version,
        approved_date: req.body.approved_date
      };
      
      // Valida campos obrigatórios
      if (!metadata.name || !metadata.document_type) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: name, document_type'
        });
      }

      // Se for URL, valida URL ao invés de arquivo
      if (metadata.is_url) {
        if (!metadata.source_url) {
          return res.status(400).json({
            success: false,
            message: 'URL é obrigatória quando tipo é "url"'
          });
        }
      } else {
        // Se for arquivo, valida se arquivo foi enviado
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'Nenhum arquivo foi enviado'
          });
        }
      }
      
      // Faz upload completo (storage + metadados) ou cadastra URL
      const document = await documentService.uploadDocument(
        req.file,
        metadata,
        req.user!.id
      );
      
      // Retorna sucesso
      return res.status(201).json({
        success: true,
        message: metadata.is_url 
          ? 'Site cadastrado com sucesso. Status: PENDING (aguardando aprovação)'
          : 'Documento enviado com sucesso. Status: PENDING (aguardando aprovação)',
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.upload error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao fazer upload'
      });
    }
  }
  
  /**
   * GET /api/v1/documents
   * Lista todos os documentos (com filtros opcionais)
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Extrai filtros da query
      const filters: DocumentFilters = {
        document_type: req.query.document_type as string,
        status: req.query.status as string,
        is_public: req.query.is_public ? req.query.is_public === 'true' : undefined,
        search: req.query.search as string
      };
      
      // 2. Busca documentos
      const documents = await documentService.getAllDocuments(filters);
      
      // 3. Retorna lista
      return res.status(200).json({
        success: true,
        data: documents,
        count: documents.length
      });
      
    } catch (error) {
      console.error('DocumentController.getAll error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar documentos'
      });
    }
  }
  
  /**
   * GET /api/v1/documents/:id
   * Busca documento por ID
   */
  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const document = await documentService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.getById error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar documento'
      });
    }
  }
  
  /**
   * GET /api/v1/documents/:id/download
   * Gera URL temporária para download
   */
  async getDownloadUrl(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const signedUrl = await documentService.getDownloadUrl(id);
      
      return res.status(200).json({
        success: true,
        data: {
          url: signedUrl,
          expiresIn: 3600 // 1 hora
        }
      });
      
    } catch (error) {
      console.error('DocumentController.getDownloadUrl error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao gerar URL de download'
      });
    }
  }
  
  /**
   * PUT /api/v1/documents/:id
   * Atualiza metadados do documento
   */
  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updates: UpdateDocumentRequest = req.body;
      
      const document = await documentService.updateDocument(id, updates, req.user!.id);
      
      return res.status(200).json({
        success: true,
        message: 'Documento atualizado com sucesso',
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.update error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar documento'
      });
    }
  }
  
  /**
   * PATCH /api/v1/documents/:id/activate
   * Ativa documento (PENDING → ACTIVE ou INACTIVE → ACTIVE)
   */
  async activate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const document = await documentService.activateDocument(id, req.user!.id);
      
      return res.status(200).json({
        success: true,
        message: 'Documento ativado com sucesso',
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.activate error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao ativar documento'
      });
    }
  }
  
  /**
   * PATCH /api/v1/documents/:id/deactivate
   * Desativa documento (ACTIVE → INACTIVE)
   */
  async deactivate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const document = await documentService.deactivateDocument(id, req.user!.id);
      
      return res.status(200).json({
        success: true,
        message: 'Documento desativado com sucesso',
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.deactivate error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao desativar documento'
      });
    }
  }
  
  /**
   * POST /api/v1/documents/:id/reindex
   * Reprocessa documento (gera embeddings/chunks)
   */
  async reindex(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      await documentService.reindexDocument(id);
      
      return res.status(200).json({
        success: true,
        message: 'Documento enviado para reprocessamento. Aguarde ~30-60 segundos.'
      });
      
    } catch (error) {
      console.error('DocumentController.reindex error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao reprocessar documento'
      });
    }
  }
  
  /**
   * DELETE /api/v1/documents/:id
   * "Exclui" documento (soft delete: status → ARCHIVED)
   */
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const document = await documentService.deleteDocument(id, req.user!.id);
      
      return res.status(200).json({
        success: true,
        message: 'Documento arquivado com sucesso',
        data: document
      });
      
    } catch (error) {
      console.error('DocumentController.delete error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao arquivar documento'
      });
    }
  }
  
  /**
   * GET /api/v1/documents/active
   * Lista apenas documentos ativos
   */
  async getActive(_req: Request, res: Response): Promise<Response> {
    try {
      const documents = await documentService.getActiveDocuments();
      
      return res.status(200).json({
        success: true,
        data: documents,
        count: documents.length
      });
      
    } catch (error) {
      console.error('DocumentController.getActive error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar documentos ativos'
      });
    }
  }
  
  /**
   * GET /api/v1/documents/public
   * Lista documentos públicos
   */
  async getPublic(_req: Request, res: Response): Promise<Response> {
    try {
      const documents = await documentService.getPublicDocuments();
      
      return res.status(200).json({
        success: true,
        data: documents,
        count: documents.length
      });
      
    } catch (error) {
      console.error('DocumentController.getPublic error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar documentos públicos'
      });
    }
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export default new DocumentController();
