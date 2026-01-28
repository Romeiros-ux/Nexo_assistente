/**
 * Document Service
 * 
 * Gerencia operações da tabela documents
 * - CRUD de metadados
 * - Upload completo (storage + metadados)
 * - Ativar/Desativar documentos
 * - Buscar com filtros
 */

import { supabase, supabaseAdmin } from '../config/supabase';
import storageService from './storage.service';

// ==========================================
// INTERFACES
// ==========================================

export interface Document {
  id: string;
  name: string;
  description?: string;
  document_type: 'NORM' | 'LAW' | 'RESOLUTION' | 'DIRECTIVE' | 'MANUAL' | 'REPORT' | 'OTHER';
  file_url: string;
  file_type?: string;
  file_size?: number;
  version: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  uploaded_at: string;
  uploaded_by: string;
  updated_at: string;
  updated_by?: string;
  is_public: boolean;
  requires_authorization: boolean;
  // Novos campos para URLs
  source_url?: string;
  is_url?: boolean;
  // Campos de estruturação
  domain?: string;
  subdomain?: string;
  metadata_year?: number;
  unit_name?: string;
  unit_id?: string;
  document_version?: string;
  approved_date?: string;
}

export interface CreateDocumentRequest {
  name: string;
  description?: string;
  document_type: 'NORM' | 'LAW' | 'RESOLUTION' | 'DIRECTIVE' | 'MANUAL' | 'REPORT' | 'OTHER';
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  is_public?: boolean;
  requires_authorization?: boolean;
  // Novos campos para URLs
  source_url?: string;
  is_url?: boolean;
  // Campos de estruturação
  domain?: string;
  subdomain?: string;
  metadata_year?: number;
  unit_name?: string;
  unit_id?: string;
  document_version?: string;
  approved_date?: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  description?: string;
  document_type?: 'NORM' | 'LAW' | 'RESOLUTION' | 'DIRECTIVE' | 'MANUAL' | 'REPORT' | 'OTHER';
  official_number?: string;
  publication_date?: string;
  effective_date?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
  is_public?: boolean;
  requires_authorization?: boolean;
  source_url?: string; // Permite atualizar URL
}

export interface DocumentFilters {
  document_type?: string;
  status?: string;
  is_public?: boolean;
  search?: string;
}

// ==========================================
// DOCUMENT SERVICE
// ==========================================

class DocumentService {
  /**
   * Upload completo: arquivo + metadados
   */
  async uploadDocument(
    file: Express.Multer.File | undefined,
    metadata: CreateDocumentRequest,
    userId: string
  ): Promise<Document> {
    try {
      let uploadResult: any = null;
      
      // Se for URL, não faz upload de arquivo
      if (metadata.is_url && metadata.source_url) {
        console.log('🌐 Cadastrando URL:', metadata.source_url);
        // Para URLs, usamos a própria URL como file_url
        uploadResult = {
          path: metadata.source_url,
          contentType: 'url/link',
          size: 0
        };
      } else {
        // Upload normal de arquivo
        if (!file) {
          throw new Error('Arquivo não fornecido');
        }
        console.log('📤 Fazendo upload do arquivo para storage...');
        uploadResult = await storageService.uploadFile(file, metadata.document_type);
      }
      
      // 2. Criar registro de metadados no banco
      console.log('💾 Salvando metadados no banco...');
      const { data, error } = await (supabase
        .from('documents') as any)
        .insert({
          name: metadata.name,
          description: metadata.description,
          document_type: metadata.document_type,
          file_url: uploadResult.path,
          file_type: uploadResult.contentType,
          file_size: uploadResult.size,
          version: '1.0',
          status: 'PENDING', // Sempre inicia como PENDING
          official_number: metadata.official_number,
          publication_date: metadata.publication_date,
          effective_date: metadata.effective_date,
          is_public: metadata.is_public || false,
          requires_authorization: metadata.requires_authorization || false,
          // Novos campos para URLs
          source_url: metadata.source_url,
          is_url: metadata.is_url || false,
          // Novos campos de estruturação
          domain: metadata.domain,
          subdomain: metadata.subdomain,
          metadata_year: metadata.metadata_year,
          unit_name: metadata.unit_name,
          unit_id: metadata.unit_id,
          document_version: metadata.document_version,
          approved_date: metadata.approved_date,
          uploaded_by: userId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao salvar metadados:', error);
        // Se falhar ao salvar metadados, NÃO deletamos o arquivo do storage
        // Pode ser recuperado manualmente depois
        throw new Error(`Falha ao salvar metadados: ${error.message}`);
      }
      
      const document = data as Document;
      
      // 3. Criar document_version automaticamente (usando admin client para ignorar RLS)
      console.log('📝 Criando versão do documento...');
      const { data: versionData, error: versionError } = await (supabaseAdmin
        .from('document_versions') as any)
        .insert({
          document_id: document.id,
          version_number: 1,
          status: 'COMPLETED',  // Processor busca por COMPLETED
          indexed: false        // Processor busca por indexed=false
        })
        .select()
        .single();
      
      if (versionError) {
        console.error('⚠️ Erro ao criar versão, mas documento foi salvo:', versionError);
      } else {
        console.log('✅ Versão criada:', versionData?.id);
        
        // 4. Adicionar à fila de processamento automaticamente
        try {
          const indexingQueue = (await import('../queues/indexing.queue')).default;
          await indexingQueue.addDocument(document.id, document.name);
          console.log('✅ Documento adicionado à fila de processamento');
        } catch (queueError) {
          console.error('⚠️ Erro ao adicionar à fila, mas documento foi salvo:', queueError);
        }
      }
      
      console.log('✅ Upload completo com sucesso!');
      return document;
      
    } catch (error) {
      console.error('DocumentService.uploadDocument error:', error);
      throw error;
    }
  }
  
  /**
   * Lista todos os documentos com filtros opcionais
   */
  async getAllDocuments(filters?: DocumentFilters): Promise<Document[]> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      // Aplica filtros se fornecidos
      if (filters) {
        if (filters.document_type) {
          query = query.eq('document_type', filters.document_type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.is_public !== undefined) {
          query = query.eq('is_public', filters.is_public);
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao listar documentos:', error);
        throw new Error(`Falha ao listar documentos: ${error.message}`);
      }
      
      return data as Document[];
      
    } catch (error) {
      console.error('DocumentService.getAllDocuments error:', error);
      throw error;
    }
  }
  
  /**
   * Busca documento por ID
   */
  async getDocumentById(id: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Erro ao buscar documento:', error);
        throw new Error(`Falha ao buscar documento: ${error.message}`);
      }
      
      return data as Document;
      
    } catch (error) {
      console.error('DocumentService.getDocumentById error:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza metadados do documento
   */
  async updateDocument(
    id: string,
    updates: UpdateDocumentRequest,
    userId: string
  ): Promise<Document> {
    try {
      const { data, error } = await (supabase
        .from('documents') as any)
        .update({
          ...updates,
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar documento:', error);
        throw new Error(`Falha ao atualizar documento: ${error.message}`);
      }
      
      return data as Document;
      
    } catch (error) {
      console.error('DocumentService.updateDocument error:', error);
      throw error;
    }
  }
  
  /**
   * Ativa um documento (PENDING → ACTIVE ou INACTIVE → ACTIVE)
   * 🚀 DISPARA JOB DE INDEXAÇÃO EM BACKGROUND (via Bull Queue)
   */
  async activateDocument(id: string, userId: string): Promise<Document> {
    // 1. Ativar documento
    const document = await this.updateDocument(id, { status: 'ACTIVE' }, userId);
    
    // 2. Adicionar documento na fila de indexação
    console.log(`\n🚀 Documento ativado. Adicionando na fila de indexação...`);
    
    try {
      // Importação dinâmica para evitar circular dependency
      const indexingQueue = (await import('../queues/indexing.queue')).default;
      
      // Adicionar job na fila (não bloqueante)
      const jobId = await indexingQueue.addDocument(document.id, document.name);
      console.log(`✅ Job criado com ID: ${jobId}`);
      console.log(`📊 Monitorar em: GET /api/v1/jobs/${jobId}`);
    } catch (error) {
      console.error(`❌ Erro ao adicionar job na fila:`, error);
      // Não lançar erro - documento já foi ativado, job pode ser retentado manualmente
    }
    
    return document;
  }
  
  /**
   * Desativa um documento (ACTIVE → INACTIVE)
   */
  async deactivateDocument(id: string, userId: string): Promise<Document> {
    return this.updateDocument(id, { status: 'INACTIVE' }, userId);
  }
  
  /**
   * Reprocessa um documento (reindexação: gera embeddings/chunks)
   * Envia o documento para a fila de processamento
   */
  async reindexDocument(id: string): Promise<void> {
    const indexingQueue = (await import('../queues/indexing.queue')).default;
    
    // Busca documento
    const document = await this.getDocumentById(id);
    if (!document) {
      throw new Error('Documento não encontrado');
    }
    
    // Valida que tem arquivo
    if (!document.file_url) {
      throw new Error('Documento não possui arquivo para processar');
    }
    
    // Envia para a fila de indexação
    await indexingQueue.addDocument(document.id, document.name);
    
    console.log(`[DocumentService] Documento ${id} enviado para reprocessamento`);
  }
  
  /**
   * "Exclui" um documento (soft delete: status → ARCHIVED)
   * ⚠️ O arquivo NÃO é deletado do storage
   */
  async deleteDocument(id: string, userId: string): Promise<Document> {
    return this.updateDocument(id, { status: 'ARCHIVED' }, userId);
  }
  
  /**
   * Busca documentos ativos (status='ACTIVE')
   */
  async getActiveDocuments(): Promise<Document[]> {
    return this.getAllDocuments({ status: 'ACTIVE' });
  }
  
  /**
   * Busca documentos públicos
   */
  async getPublicDocuments(): Promise<Document[]> {
    return this.getAllDocuments({ status: 'ACTIVE', is_public: true });
  }
  
  /**
   * Busca documentos por tipo
   */
  async getDocumentsByType(type: string): Promise<Document[]> {
    return this.getAllDocuments({ document_type: type });
  }
  
  /**
   * Gera URL temporária para download do arquivo
   */
  async getDownloadUrl(id: string): Promise<string> {
    try {
      // 1. Busca documento no banco
      const document = await this.getDocumentById(id);
      if (!document) {
        throw new Error('Documento não encontrado');
      }
      
      // 2. Gera URL assinada (válida por 1 hora)
      const signedUrl = await storageService.getSignedUrl(document.file_url, 3600);
      
      return signedUrl;
      
    } catch (error) {
      console.error('DocumentService.getDownloadUrl error:', error);
      throw error;
    }
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export default new DocumentService();
