/**
 * Document Preparation Service
 * 
 * Orquestrador do pipeline de preparação de documentos para RAG
 * 
 * PIPELINE:
 * 1. Baixar arquivo do Storage
 * 2. Extrair texto (textExtractor)
 * 3. Dividir em chunks (chunker)
 * 4. Persistir versão + chunks no banco
 * 5. Marcar documento como "prepared"
 * 
 * ⚠️ SEM IA, SEM EMBEDDINGS (isso é FASE 2)
 */

import { supabase, supabaseAdmin } from '../config/supabase';
import storageService from './storage.service';
import textExtractorService from './textExtractor.service';
import chunkerService, { Chunk } from './chunker.service';
import indexingService from './indexing.service';

// ==========================================
// INTERFACES
// ==========================================

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extracted_text_length?: number;
  extraction_method?: string;
  extraction_error?: string;
  created_at: string;
  completed_at?: string;
}

export interface PreparationResult {
  success: boolean;
  document_id: string;
  version_id?: string;
  version_number?: number;
  chunks_count?: number;
  error?: string;
  extraction_method?: string;
}

// ==========================================
// DOCUMENT PREPARATION SERVICE
// ==========================================

class DocumentPreparationService {
  
  /**
   * Prepara um documento completo
   * (Entry point do pipeline)
   */
  async prepareDocument(documentId: string): Promise<PreparationResult> {
    console.log(`\n🚀 Iniciando preparação do documento: ${documentId}`);
    
    try {
      // 1. Buscar documento no banco
      const document = await this.getDocument(documentId);
      if (!document) {
        return {
          success: false,
          document_id: documentId,
          error: 'Documento não encontrado'
        };
      }
      
      // 2. Verificar se já está preparado
      if (document.prepared) {
        console.log('⏭️  Documento já preparado, pulando...');
        return {
          success: true,
          document_id: documentId,
          error: 'Documento já preparado anteriormente'
        };
      }
      
      // 3. Criar versão (status PROCESSING)
      console.log('📝 Criando nova versão...');
      const version = await this.createVersion(documentId);
      
      // 4. Baixar arquivo do Storage
      console.log('📥 Baixando arquivo do Storage...');
      const fileBuffer = await this.downloadFile(document.file_url);
      
      // 5. Extrair texto
      console.log('📄 Extraindo texto...');
      const extraction = await textExtractorService.extractText(
        fileBuffer,
        document.file_type,
        document.name
      );
      
      if (!extraction.success) {
        await this.markVersionFailed(version.id, extraction.error || 'Falha na extração');
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: extraction.error
        };
      }
      
      // 6. Validar texto extraído
      const validation = textExtractorService.validateExtractedText(extraction.text);
      if (!validation.valid) {
        await this.markVersionFailed(version.id, validation.reason || 'Texto inválido');
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: validation.reason
        };
      }
      
      // 7. Dividir em chunks (com otimização para tabulares)
      console.log('✂️  Dividindo em chunks...');
      const isTabular = extraction.isTabular || false;
      const chunks = await chunkerService.chunkText(extraction.text, undefined, isTabular);
      
      if (isTabular) {
        console.log('📊 Detectado dado tabular (CSV/Excel) - usando chunking otimizado');
      }
      
      // 8. Validar chunks (com regras apropriadas)
      const chunkValidation = chunkerService.validateChunks(chunks, isTabular);
      if (!chunkValidation.valid) {
        await this.markVersionFailed(version.id, `Chunks inválidos: ${chunkValidation.issues.join(', ')}`);
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: `Chunks inválidos: ${chunkValidation.issues.join(', ')}`
        };
      }
      
      // 9. Persistir chunks no banco
      console.log('💾 Salvando chunks no banco...');
      await this.saveChunks(version.id, chunks);
      
      // 10. Atualizar versão (COMPLETED)
      await this.markVersionCompleted(
        version.id,
        extraction.text.length,
        extraction.method
      );
      
      // 11. Marcar documento como "prepared"
      await this.markDocumentPrepared(documentId);
      
      console.log(`✅ Documento preparado com sucesso! ${chunks.length} chunks gerados.`);
      
      // 12. FASE 2: Indexar embeddings automaticamente
      console.log(`🔄 Iniciando indexação automática...`);
      await indexingService.indexAfterPreparation(version.id);
      
      return {
        success: true,
        document_id: documentId,
        version_id: version.id,
        version_number: version.version_number,
        chunks_count: chunks.length,
        extraction_method: extraction.method
      };
      
    } catch (error: any) {
      console.error('❌ Erro no pipeline de preparação:', error);
      return {
        success: false,
        document_id: documentId,
        error: error.message || 'Erro desconhecido no pipeline'
      };
    }
  }

  /**
   * Processa uma versão existente (não cria nova versão)
   * Usado pelo indexing processor quando a versão já foi criada no upload
   */
  async processExistingVersion(documentId: string): Promise<PreparationResult> {
    console.log(`\n🚀 Processando versão existente do documento: ${documentId}`);
    
    try {
      // 1. Buscar documento no banco
      const document = await this.getDocument(documentId);
      if (!document) {
        return {
          success: false,
          document_id: documentId,
          error: 'Documento não encontrado'
        };
      }
      
      // 2. Buscar versão COMPLETED mais recente (criada no upload)
      const { data: version, error: versionError } = await supabaseAdmin
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .eq('status', 'COMPLETED')
        .order('version_number', { ascending: false })
        .limit(1)
        .single() as { data: DocumentVersion | null; error: any };

      if (versionError || !version) {
        return {
          success: false,
          document_id: documentId,
          error: 'Nenhuma versão encontrada para processar'
        };
      }

      // 3. Verificar se já foi processada (chunks existem)
      const { data: existingChunks } = await supabaseAdmin
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id)
        .limit(1);

      if (existingChunks && existingChunks.length > 0) {
        console.log('⏭️  Versão já processada, pulando extração...');
        const { count } = await supabaseAdmin
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_version_id', version.id);

        return {
          success: true,
          document_id: documentId,
          version_id: version.id,
          version_number: version.version_number,
          chunks_count: count || 0,
          error: 'Versão já processada anteriormente'
        };
      }

      // 4. Baixar arquivo do Storage
      console.log('📥 Baixando arquivo do Storage...');
      const fileBuffer = await this.downloadFile(document.file_url);
      
      // 5. Extrair texto
      console.log('📄 Extraindo texto...');
      const extraction = await textExtractorService.extractText(
        fileBuffer,
        document.file_type,
        document.name
      );
      
      if (!extraction.success) {
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: extraction.error
        };
      }
      
      // 6. Validar texto extraído
      const validation = textExtractorService.validateExtractedText(extraction.text);
      if (!validation.valid) {
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: validation.reason
        };
      }
      
      // 7. Dividir em chunks (com otimização para tabulares)
      console.log('✂️  Dividindo em chunks...');
      const isTabular = extraction.isTabular || false;
      const chunks = await chunkerService.chunkText(extraction.text, undefined, isTabular);
      
      if (isTabular) {
        console.log('📊 Detectado dado tabular (CSV/Excel) - usando chunking otimizado');
      }
      
      // 8. Validar chunks (com regras apropriadas)
      const chunkValidation = chunkerService.validateChunks(chunks, isTabular);
      if (!chunkValidation.valid) {
        return {
          success: false,
          document_id: documentId,
          version_id: version.id,
          error: `Chunks inválidos: ${chunkValidation.issues.join(', ')}`
        };
      }
      
      // 9. Persistir chunks no banco
      console.log('💾 Salvando chunks no banco...');
      await this.saveChunks(version.id, chunks);
      
      // 10. Marcar documento como "prepared"
      await this.markDocumentPrepared(documentId);
      
      console.log(`✅ Versão processada com sucesso! ${chunks.length} chunks gerados.`);
      
      return {
        success: true,
        document_id: documentId,
        version_id: version.id,
        version_number: version.version_number,
        chunks_count: chunks.length,
        extraction_method: extraction.method
      };
      
    } catch (error: any) {
      console.error('❌ Erro no processamento da versão:', error);
      return {
        success: false,
        document_id: documentId,
        error: error.message || 'Erro desconhecido no processamento'
      };
    }
  }
  
  /**
   * Busca documento no banco
   */
  private async getDocument(documentId: string): Promise<any> {
    const { data, error } = await (supabaseAdmin
      .from('documents') as any)
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar documento:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Cria nova versão do documento (status PROCESSING)
   */
  private async createVersion(documentId: string): Promise<DocumentVersion> {
    const { data, error } = await (supabaseAdmin
      .from('document_versions') as any)
      .insert({
        document_id: documentId,
        status: 'PROCESSING'
        // version_number é auto-incrementado pela trigger
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Falha ao criar versão: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Baixa arquivo do Supabase Storage
   */
  private async downloadFile(filePath: string): Promise<Buffer> {
    const result = await storageService.downloadFile(filePath);
    return result.buffer;
  }
  
  /**
   * Salva chunks no banco
   */
  private async saveChunks(versionId: string, chunks: Chunk[]): Promise<void> {
    const chunkRecords = chunks.map(chunk => ({
      document_version_id: versionId,
      content: chunk.content,
      chunk_index: chunk.index,
      metadata: chunk.metadata
    }));
    
    const { error } = await (supabaseAdmin
      .from('document_chunks') as any)
      .insert(chunkRecords);
    
    if (error) {
      throw new Error(`Falha ao salvar chunks: ${error.message}`);
    }
    
    console.log(`✅ ${chunks.length} chunks salvos no banco`);
  }
  
  /**
   * Marca versão como COMPLETED
   */
  private async markVersionCompleted(
    versionId: string,
    textLength: number,
    method: string
  ): Promise<void> {
    const { error } = await (supabaseAdmin
      .from('document_versions') as any)
      .update({
        status: 'COMPLETED',
        extracted_text_length: textLength,
        extraction_method: method,
        completed_at: new Date().toISOString()
      })
      .eq('id', versionId);
    
    if (error) {
      throw new Error(`Falha ao atualizar versão: ${error.message}`);
    }
  }
  
  /**
   * Marca versão como FAILED
   */
  private async markVersionFailed(versionId: string, errorMessage: string): Promise<void> {
    await (supabaseAdmin
      .from('document_versions') as any)
      .update({
        status: 'FAILED',
        extraction_error: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', versionId);
  }
  
  /**
   * Marca documento como "prepared"
   */
  private async markDocumentPrepared(documentId: string): Promise<void> {
    const { error } = await (supabaseAdmin
      .from('documents') as any)
      .update({
        prepared: true
      })
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Falha ao marcar documento como prepared: ${error.message}`);
    }
  }
  
  /**
   * Busca estatísticas de preparação de um documento
   */
  async getPreparationStats(documentId: string): Promise<any> {
    const { data, error } = await (supabase
      .from('v_document_preparation_stats') as any)
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Lista todos os documentos ativos não preparados
   */
  async getUnpreparedDocuments(): Promise<any[]> {
    const { data, error } = await (supabase
      .from('documents') as any)
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('prepared', false);
    
    if (error) {
      console.error('Erro ao buscar documentos não preparados:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Reprocessa documento (cria nova versão)
   */
  async reprocessDocument(documentId: string): Promise<PreparationResult> {
    console.log(`🔄 Reprocessando documento: ${documentId}`);
    
    // Desmarcar como prepared
    await (supabase
      .from('documents') as any)
      .update({ prepared: false })
      .eq('id', documentId);
    
    // Executar pipeline novamente
    return await this.prepareDocument(documentId);
  }
  
}

// Singleton
const documentPreparationService = new DocumentPreparationService();
export default documentPreparationService;
