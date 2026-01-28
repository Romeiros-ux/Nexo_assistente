/**
 * Document Service - Frontend
 * 
 * Serviço para gerenciar documentos institucionais
 * - Upload de documentos
 * - Listagem com filtros
 * - Download via signed URLs
 * - Ativação/Desativação/Exclusão (TI apenas)
 * - Atualização de metadados
 */

import apiClient from '../lib/apiClient';

// ==========================================
// TYPES
// ==========================================

export type DocumentType = 'NORM' | 'LAW' | 'RESOLUTION' | 'DIRECTIVE' | 'MANUAL' | 'REPORT' | 'OTHER';
export type DocumentStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';

export interface Document {
  id: string;
  name: string;
  description?: string;
  document_type: DocumentType;
  file_url: string;
  file_type: string;
  file_size: number;
  version: string;
  status: DocumentStatus;
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  is_public: boolean;
  requires_authorization: boolean;
  uploaded_by: string;
  uploaded_at: string;
  updated_by?: string;
  updated_at?: string;
  // Novo campo para URLs de sites
  source_url?: string;
  is_url?: boolean;
  // Campos para estruturação da base de conhecimento
  domain?: string;
  subdomain?: string;
  metadata_year?: number;
  unit_name?: string;
  unit_id?: string;
  document_version?: string;
  approved_date?: string;
}

export interface DocumentUploadRequest {
  file?: File; // Agora é opcional (pode ser arquivo OU URL)
  source_url?: string; // URL do site
  is_url?: boolean; // Indica se é URL ou arquivo
  name: string;
  description?: string;
  document_type: DocumentType;
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  is_public?: boolean;
  requires_authorization?: boolean;
  tags?: string[]; // Tags para facilitar busca
  authorized_profiles?: string[]; // Perfis autorizados quando requires_authorization=true
  // Campos para estruturação da base de conhecimento
  domain?: string;
  subdomain?: string;
  metadata_year?: number;
  unit_name?: string;
  unit_id?: string;
  document_version?: string;
  approved_date?: string;
}

export interface DocumentUpdateRequest {
  name?: string;
  description?: string;
  document_type?: DocumentType;
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  is_public?: boolean;
  requires_authorization?: boolean;
  source_url?: string; // URL do site (para edição)
  tags?: string[]; // Tags para facilitar busca
  authorized_profiles?: string[]; // Perfis autorizados quando requires_authorization=true
  // Campos para estruturação da base de conhecimento
  domain?: string;
  subdomain?: string;
  metadata_year?: number;
  unit_name?: string;
  unit_id?: string;
  document_version?: string;
  approved_date?: string;
}

export interface DocumentFilters {
  document_type?: DocumentType;
  status?: DocumentStatus;
  is_public?: boolean;
  search?: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresIn: number;
}

// ==========================================
// DOCUMENT SERVICE
// ==========================================

class DocumentService {
  /**
   * Faz upload de documento
   * Envia arquivo + metadados via multipart/form-data
   * 
   * @param request - Dados do documento (file + metadados)
   * @returns Documento criado (status PENDING)
   */
  async upload(request: DocumentUploadRequest): Promise<Document> {
    const formData = new FormData();
    
    // Arquivo
    formData.append('file', request.file);
    
    // Metadados obrigatórios
    formData.append('name', request.name);
    formData.append('document_type', request.document_type);
    
    // Metadados opcionais
    if (request.description) {
      formData.append('description', request.description);
    }
    
    if (request.official_number) {
      formData.append('official_number', request.official_number);
    }
    
    if (request.publication_date) {
      formData.append('publication_date', request.publication_date);
    }
    
    if (request.effective_date) {
      formData.append('effective_date', request.effective_date);
    }
    
    if (request.is_public !== undefined) {
      formData.append('is_public', String(request.is_public));
    }
    
    if (request.requires_authorization !== undefined) {
      formData.append('requires_authorization', String(request.requires_authorization));
    }
    
    // Novos campos de estruturação da base de conhecimento
    if (request.domain) {
      formData.append('domain', request.domain);
    }
    
    if (request.subdomain) {
      formData.append('subdomain', request.subdomain);
    }
    
    if (request.metadata_year) {
      formData.append('metadata_year', String(request.metadata_year));
    }
    
    if (request.unit_name) {
      formData.append('unit_name', request.unit_name);
    }
    
    if (request.unit_id) {
      formData.append('unit_id', request.unit_id);
    }
    
    if (request.document_version) {
      formData.append('document_version', request.document_version);
    }
    
    if (request.approved_date) {
      formData.append('approved_date', request.approved_date);
    }
    
    const response = await apiClient.post<{ data: Document }>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }
  
  /**
   * Lista todos os documentos (com filtros opcionais)
   * 
   * @param filters - Filtros opcionais (tipo, status, público, busca)
   * @returns Lista de documentos
   */
  async getAll(filters?: DocumentFilters): Promise<Document[]> {
    const params = new URLSearchParams();
    
    if (filters?.document_type) {
      params.append('document_type', filters.document_type);
    }
    
    if (filters?.status) {
      params.append('status', filters.status);
    }
    
    if (filters?.is_public !== undefined) {
      params.append('is_public', String(filters.is_public));
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    const queryString = params.toString();
    const url = queryString ? `/documents?${queryString}` : '/documents';
    
    const response = await apiClient.get<{ data: Document[] }>(url);
    return response.data.data;
  }
  
  /**
   * Lista apenas documentos ativos
   * 
   * @returns Lista de documentos com status ACTIVE
   */
  async getActive(): Promise<Document[]> {
    const response = await apiClient.get<{ data: Document[] }>('/documents/active');
    return response.data.data;
  }
  
  /**
   * Lista documentos públicos
   * 
   * @returns Lista de documentos públicos e ativos
   */
  async getPublic(): Promise<Document[]> {
    const response = await apiClient.get<{ data: Document[] }>('/documents/public');
    return response.data.data;
  }
  
  /**
   * Busca documento por ID
   * 
   * @param id - ID do documento
   * @returns Documento encontrado
   */
  async getById(id: string): Promise<Document> {
    const response = await apiClient.get<{ data: Document }>(`/documents/${id}`);
    return response.data.data;
  }
  
  /**
   * Gera URL temporária para download
   * URL válida por 1 hora
   * 
   * @param id - ID do documento
   * @returns URL temporária + tempo de expiração
   */
  async getDownloadUrl(id: string): Promise<DownloadUrlResponse> {
    const response = await apiClient.get<{ data: DownloadUrlResponse }>(`/documents/${id}/download`);
    return response.data.data;
  }
  
  /**
   * Baixa documento
   * Gera URL temporária e abre em nova aba
   * 
   * @param id - ID do documento
   */
  async download(id: string): Promise<void> {
    const { url } = await this.getDownloadUrl(id);
    window.open(url, '_blank');
  }
  
  /**
   * Atualiza metadados do documento
   * Requer permissão: TI ou COMISSAO
   * 
   * @param id - ID do documento
   * @param updates - Campos a atualizar
   * @returns Documento atualizado
   */
  async update(id: string, updates: DocumentUpdateRequest): Promise<Document> {
    const response = await apiClient.put<{ data: Document }>(`/documents/${id}`, updates);
    return response.data.data;
  }
  
  /**
   * Ativa documento (PENDING → ACTIVE)
   * Requer permissão: TI apenas
   * 
   * @param id - ID do documento
   * @returns Documento ativado
   */
  async activate(id: string): Promise<Document> {
    const response = await apiClient.patch<{ data: Document }>(`/documents/${id}/activate`);
    return response.data.data;
  }
  
  /**
   * Desativa documento (ACTIVE → INACTIVE)
   * Requer permissão: TI apenas
   * 
   * @param id - ID do documento
   * @returns Documento desativado
   */
  async deactivate(id: string): Promise<Document> {
    const response = await apiClient.patch<{ data: Document }>(`/documents/${id}/deactivate`);
    return response.data.data;
  }
  
  /**
   * "Exclui" documento (soft delete: ARCHIVED)
   * Arquivo permanece no Storage
   * Requer permissão: TI apenas
   * 
   * @param id - ID do documento
   * @returns Documento arquivado
   */
  async delete(id: string): Promise<Document> {
    const response = await apiClient.delete<{ data: Document }>(`/documents/${id}`);
    return response.data.data;
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export default new DocumentService();
