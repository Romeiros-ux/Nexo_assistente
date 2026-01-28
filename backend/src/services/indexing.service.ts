/**
 * FASE 2 - Indexing Service
 * 
 * Responsável por indexar chunks de documentos (gerar embeddings)
 * - Detectar versões não indexadas
 * - Processar chunks em batches
 * - Persistir embeddings no banco
 * - Marcar versões como indexadas
 * - Logging de custos
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import embeddingService from './embedding.service';
import { v4 as uuidv4 } from 'uuid';

// ===================================
// INTERFACES
// ===================================

interface EmbeddingRecord {
  id: string;
  document_chunk_id: string;
  embedding: number[];
  model: string;
  model_version: string;
  tokens_used: number;
}

export type IndexingStatus = 
  | 'NOT_STARTED'        // Versão criada mas não iniciou indexação
  | 'IN_PROGRESS'        // Indexação em andamento
  | 'COMPLETED'          // Indexação concluída com sucesso
  | 'PARTIAL_INDEXED'    // Alguns chunks foram indexados, mas não todos
  | 'INDEXING_FAILED';   // Falha na indexação

export interface IndexingResult {
  success: boolean;
  version_id: string;
  document_id: string;
  chunks_indexed: number;
  total_tokens: number;
  total_cost: number;
  duration_ms: number;
  status: IndexingStatus;
  error?: string;
}

export interface IndexingStats {
  total_documents: number;
  indexed_documents: number;
  pending_documents: number;
  total_chunks: number;
  indexed_chunks: number;
  total_tokens: number;
  total_cost: number;
}

// ===================================
// CONFIGURAÇÃO SUPABASE
// ===================================

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// ===================================
// INDEXING SERVICE
// ===================================

class IndexingService {
  private batchSize: number;
  private model: string;
  private modelVersion: string;

  constructor() {
    this.batchSize = parseInt(process.env.OPENAI_BATCH_SIZE || '50', 10);
    this.model = process.env.OPENAI_MODEL || 'text-embedding-3-large';
    this.modelVersion = 'v1';

    console.log('[IndexingService] Inicializado:', {
      batchSize: this.batchSize,
      model: this.model,
    });
  }

  /**
   * Indexar uma versão específica de documento
   * Usado quando o usuário força a reindexação
   */
  async indexVersion(versionId: string): Promise<IndexingResult> {
    const startTime = Date.now();

    console.log(`[IndexingService] Iniciando indexação da versão: ${versionId}`);

    try {
      // 1. Buscar informações da versão
      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .select('id, document_id, version_number, status, indexed')
        .eq('id', versionId)
        .single();

      if (versionError || !version) {
        throw new Error(`Versão não encontrada: ${versionId}`);
      }

      if (version.status !== 'COMPLETED') {
        throw new Error(`Versão ainda não foi preparada (status: ${version.status})`);
      }

      // 2. Buscar chunks da versão (TODOS - Supabase limita a 1000 por padrão)
      // Para documentos grandes, buscar em lotes
      let allChunks: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      console.log(`[IndexingService] Buscando chunks da versão...`);

      while (hasMore) {
        const { data: chunks, error: chunksError } = await supabase
          .from('document_chunks')
          .select('id, document_version_id, content, chunk_index, metadata')
          .eq('document_version_id', versionId)
          .order('chunk_index', { ascending: true })
          .range(from, from + pageSize - 1);

        if (chunksError) {
          throw new Error(`Erro ao buscar chunks: ${chunksError.message}`);
        }

        if (!chunks || chunks.length === 0) {
          hasMore = false;
          break;
        }

        allChunks = allChunks.concat(chunks);
        from += pageSize;
        hasMore = chunks.length === pageSize;

        console.log(`[IndexingService] ${allChunks.length} chunks carregados até agora...`);
      }

      const chunks = allChunks;

      if (chunks.length === 0) {
        throw new Error('Nenhum chunk encontrado para indexar');
      }

      console.log(`[IndexingService] ${chunks.length} chunks encontrados`);

      // 3. Verificar se já existem embeddings (reindexação)
      const { data: existingEmbeddings } = await supabase
        .from('document_embeddings')
        .select('document_chunk_id')
        .in('document_chunk_id', chunks.map(c => c.id))
        .eq('model', this.model);

      const existingChunkIds = new Set(existingEmbeddings?.map(e => e.document_chunk_id) || []);

      if (existingChunkIds.size > 0) {
        console.log(`[IndexingService] ${existingChunkIds.size} embeddings já existem, serão recriados`);
        
        // Deletar embeddings antigos
        await supabase
          .from('document_embeddings')
          .delete()
          .in('document_chunk_id', chunks.map(c => c.id))
          .eq('model', this.model);
      }

      // 4. Gerar embeddings em batches
      const texts = chunks.map(chunk => chunk.content);
      const result = await embeddingService.generateEmbeddingsInBatches(texts);

      console.log(`[IndexingService] Embeddings gerados: ${result.embeddings.length}`);

      // 5. Preparar registros para inserção
      const embeddingRecords: EmbeddingRecord[] = chunks.map((chunk, index) => ({
        id: uuidv4(),
        document_chunk_id: chunk.id,
        embedding: result.embeddings[index],
        model: this.model,
        model_version: this.modelVersion,
        tokens_used: embeddingService.countTokens(chunk.content),
      }));

      // 6. Inserir embeddings no banco EM LOTES (evita timeout do Supabase)
      const batchSize = 500; // Supabase funciona melhor com lotes menores
      let totalInserted = 0;

      for (let i = 0; i < embeddingRecords.length; i += batchSize) {
        const batch = embeddingRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('document_embeddings')
          .insert(batch);

        if (insertError) {
          throw new Error(`Erro ao inserir batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
        }

        totalInserted += batch.length;
        console.log(`[IndexingService] ${totalInserted}/${embeddingRecords.length} embeddings persistidos`);

        // Pequeno delay entre batches para não sobrecarregar
        if (i + batchSize < embeddingRecords.length) {
          await this.sleep(100);
        }
      }

      console.log(`[IndexingService] ✅ Todos os ${totalInserted} embeddings persistidos com sucesso`);

      // 7. Marcar versão como indexada
      const { error: updateError } = await supabase
        .from('document_versions')
        .update({ indexed: true })
        .eq('id', versionId);

      if (updateError) {
        console.error('[IndexingService] Erro ao marcar versão como indexada:', updateError);
        // Não lançar erro aqui, embeddings já foram salvos
      }

      const duration = Date.now() - startTime;

      // 8. Log de custo
      console.log(`[IndexingService] ✅ Indexação concluída:`, {
        version_id: versionId,
        document_id: version.document_id,
        chunks: chunks.length,
        tokens: result.tokens,
        cost: `$${result.cost.toFixed(6)}`,
        duration: `${duration}ms`,
      });

      const status = this.determineIndexingStatus(chunks.length, chunks.length, false);

      return {
        success: true,
        version_id: versionId,
        document_id: version.document_id,
        chunks_indexed: chunks.length,
        total_tokens: result.tokens,
        total_cost: result.cost,
        duration_ms: duration,
        status,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[IndexingService] ❌ Erro na indexação:', error);

      return {
        success: false,
        version_id: versionId,
        document_id: '',
        chunks_indexed: 0,
        total_tokens: 0,
        total_cost: 0,
        duration_ms: duration,
        status: 'INDEXING_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Processar todas as versões pendentes (não indexadas)
   * Usado por job agendado ou trigger manual
   */
  async processPendingVersions(): Promise<IndexingResult[]> {
    console.log('[IndexingService] Buscando versões pendentes...');

    try {
      // Buscar versões completadas mas não indexadas
      const { data: pendingVersions, error } = await supabase
        .from('document_versions')
        .select('id, document_id, version_number, status')
        .eq('status', 'COMPLETED')
        .eq('indexed', false)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar versões pendentes: ${error.message}`);
      }

      if (!pendingVersions || pendingVersions.length === 0) {
        console.log('[IndexingService] Nenhuma versão pendente encontrada');
        return [];
      }

      console.log(`[IndexingService] ${pendingVersions.length} versões pendentes encontradas`);

      // Processar cada versão
      const results: IndexingResult[] = [];

      for (const version of pendingVersions) {
        console.log(`[IndexingService] Processando versão ${version.id}...`);
        const result = await this.indexVersion(version.id);
        results.push(result);

        // Pequeno delay entre versões
        await this.sleep(1000);
      }

      // Resumo
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalTokens = results.reduce((sum, r) => sum + r.total_tokens, 0);
      const totalCost = results.reduce((sum, r) => sum + r.total_cost, 0);

      console.log('[IndexingService] Processamento em batch concluído:', {
        total: results.length,
        successful,
        failed,
        totalTokens,
        totalCost: `$${totalCost.toFixed(6)}`,
      });

      return results;

    } catch (error) {
      console.error('[IndexingService] Erro ao processar versões pendentes:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de indexação
   * Usa a view v_indexing_stats criada na migration
   */
  async getIndexingStats(): Promise<IndexingStats> {
    try {
      const { data: stats, error } = await supabase
        .from('v_indexing_stats')
        .select('*');

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      if (!stats || stats.length === 0) {
        return {
          total_documents: 0,
          indexed_documents: 0,
          pending_documents: 0,
          total_chunks: 0,
          indexed_chunks: 0,
          total_tokens: 0,
          total_cost: 0,
        };
      }

      // Agregar estatísticas
      const totalDocuments = stats.length;
      const indexedDocuments = stats.filter(s => s.indexing_status === 'TOTALMENTE_INDEXADO').length;
      const pendingDocuments = stats.filter(s => s.indexing_status !== 'TOTALMENTE_INDEXADO').length;
      const totalChunks = stats.reduce((sum, s) => sum + (s.total_chunks || 0), 0);
      const indexedChunks = stats.reduce((sum, s) => sum + (s.indexed_chunks || 0), 0);
      const totalTokens = stats.reduce((sum, s) => sum + (s.total_tokens_used || 0), 0);
      const totalCost = embeddingService.calculateCost(totalTokens);

      return {
        total_documents: totalDocuments,
        indexed_documents: indexedDocuments,
        pending_documents: pendingDocuments,
        total_chunks: totalChunks,
        indexed_chunks: indexedChunks,
        total_tokens: totalTokens,
        total_cost: totalCost,
      };

    } catch (error) {
      console.error('[IndexingService] Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Obter status de indexação de um documento específico
   */
  async getDocumentIndexingStatus(documentId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('v_indexing_stats')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar status: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('[IndexingService] Erro ao obter status do documento:', error);
      throw error;
    }
  }

  /**
   * Indexar automaticamente após preparação de documento
   * Chamado pelo documentPreparation.service após chunking
   */
  async indexAfterPreparation(versionId: string): Promise<void> {
    console.log(`[IndexingService] Auto-indexação iniciada para versão: ${versionId}`);

    try {
      const result = await this.indexVersion(versionId);

      if (result.success) {
        console.log(`[IndexingService] Auto-indexação bem-sucedida: ${result.chunks_indexed} chunks`);
      } else {
        console.error(`[IndexingService] Auto-indexação falhou: ${result.error}`);
      }

    } catch (error) {
      console.error('[IndexingService] Erro na auto-indexação:', error);
      // Não lançar erro - preparação já foi concluída
    }
  }

  /**
   * Verificar se uma versão precisa de reindexação
   * (se o modelo mudou ou embeddings estão incompletos)
   */
  async needsReindexing(versionId: string): Promise<boolean> {
    try {
      // Buscar chunks da versão
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', versionId);

      if (chunksError || !chunks) {
        return false;
      }

      // Buscar embeddings existentes
      const { data: embeddings, error: embeddingsError } = await supabase
        .from('document_embeddings')
        .select('document_chunk_id, model')
        .in('document_chunk_id', chunks.map(c => c.id))
        .eq('model', this.model);

      if (embeddingsError) {
        return false;
      }

      // Se número de embeddings != número de chunks, precisa reindexar
      const needsReindex = !embeddings || embeddings.length !== chunks.length;

      return needsReindex;

    } catch (error) {
      console.error('[IndexingService] Erro ao verificar necessidade de reindexação:', error);
      return false;
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determina o status de indexação baseado nos chunks
   */
  private determineIndexingStatus(
    totalChunks: number,
    indexedChunks: number,
    hadError: boolean
  ): IndexingStatus {
    if (hadError) {
      if (indexedChunks === 0) {
        return 'INDEXING_FAILED';
      }
      return 'PARTIAL_INDEXED';
    }

    if (indexedChunks === 0) {
      return 'NOT_STARTED';
    }

    if (indexedChunks < totalChunks) {
      return 'PARTIAL_INDEXED';
    }

    return 'COMPLETED';
  }
}

// Singleton
const indexingService = new IndexingService();

export default indexingService;
