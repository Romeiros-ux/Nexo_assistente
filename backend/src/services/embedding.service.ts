/**
 * FASE 2 - Embedding Service
 * 
 * Responsável por gerar embeddings vetoriais usando OpenAI API
 * - Geração de embeddings individuais (queries)
 * - Geração em batch (chunks de documentos)
 * - Contagem de tokens (tiktoken)
 * - Cálculo de custos
 * - Validações e retry logic
 */

import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';

// ===================================
// INTERFACES
// ===================================

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  cost: number;
  model: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  tokens: number;
  cost: number;
  model: string;
}

interface EmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions: number;
  maxTokens: number;
  batchSize: number;
}

// ===================================
// SERVIÇO DE EMBEDDINGS
// ===================================

class EmbeddingService {
  private openai: OpenAI;
  private config: EmbeddingConfig;
  private encoding: any;

  constructor(
    openaiClient?: OpenAI,
    config?: Partial<EmbeddingConfig>
  ) {
    // Configuração via variáveis de ambiente ou parâmetros
    this.config = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      model: config?.model || process.env.OPENAI_MODEL || 'text-embedding-3-large',
      dimensions: config?.dimensions || parseInt(process.env.OPENAI_DIMENSIONS || '1536', 10),
      maxTokens: config?.maxTokens || parseInt(process.env.OPENAI_MAX_TOKENS || '8191', 10),
      batchSize: config?.batchSize || parseInt(process.env.OPENAI_BATCH_SIZE || '50', 10),
    };

    if (!this.config.apiKey && !openaiClient) {
      throw new Error('OPENAI_API_KEY não configurada no .env');
    }

    // Inicializar cliente OpenAI (injetado ou criado)
    this.openai = openaiClient || new OpenAI({
      apiKey: this.config.apiKey,
    });

    // Inicializar encoding para contagem de tokens
    // text-embedding-3-large usa o mesmo encoding do text-embedding-ada-002
    this.encoding = encoding_for_model('text-embedding-ada-002');

    console.log('[EmbeddingService] Inicializado:', {
      model: this.config.model,
      dimensions: this.config.dimensions,
      maxTokens: this.config.maxTokens,
      batchSize: this.config.batchSize,
    });
  }

  /**
   * Gerar embedding para um único texto (usado em queries)
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Validar texto
    const validation = this.validateText(text);
    if (!validation.valid) {
      throw new Error(`Texto inválido: ${validation.reason}`);
    }

    const tokens = this.countTokens(text);
    const cost = this.calculateCost(tokens);

    console.log(`[EmbeddingService] Gerando embedding: ${tokens} tokens, $${cost.toFixed(6)}`);

    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.openai.embeddings.create({
          model: this.config.model,
          input: text,
          dimensions: this.config.dimensions,
        });
      });

      return {
        embedding: response.data[0].embedding,
        tokens,
        cost,
        model: this.config.model,
      };
    } catch (error) {
      console.error('[EmbeddingService] Erro ao gerar embedding:', error);
      throw new Error(`Falha ao gerar embedding: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gerar embeddings em batch (usado para chunks de documentos)
   * Processa até batchSize textos por requisição
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      throw new Error('Array de textos vazio');
    }

    if (texts.length > this.config.batchSize) {
      throw new Error(`Batch muito grande: ${texts.length} textos (máximo: ${this.config.batchSize})`);
    }

    // Validar todos os textos
    for (let i = 0; i < texts.length; i++) {
      const validation = this.validateText(texts[i]);
      if (!validation.valid) {
        throw new Error(`Texto ${i} inválido: ${validation.reason}`);
      }
    }

    const totalTokens = texts.reduce((sum, text) => sum + this.countTokens(text), 0);
    const cost = this.calculateCost(totalTokens);

    console.log(`[EmbeddingService] Gerando batch: ${texts.length} textos, ${totalTokens} tokens, $${cost.toFixed(6)}`);

    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.openai.embeddings.create({
          model: this.config.model,
          input: texts,
          dimensions: this.config.dimensions,
        });
      });

      // Ordenar embeddings pela ordem original (API pode retornar fora de ordem)
      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      return {
        embeddings,
        tokens: totalTokens,
        cost,
        model: this.config.model,
      };
    } catch (error) {
      console.error('[EmbeddingService] Erro ao gerar batch:', error);
      throw new Error(`Falha ao gerar batch: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processar array grande dividindo em batches
   * Útil quando há muitos chunks para indexar
   */
  async generateEmbeddingsInBatches(texts: string[]): Promise<BatchEmbeddingResult> {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      batches.push(texts.slice(i, i + this.config.batchSize));
    }

    console.log(`[EmbeddingService] Processando ${texts.length} textos em ${batches.length} batches`);

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;
    let totalCost = 0;

    for (let i = 0; i < batches.length; i++) {
      console.log(`[EmbeddingService] Batch ${i + 1}/${batches.length}`);
      
      const result = await this.generateEmbeddingsBatch(batches[i]);
      
      allEmbeddings.push(...result.embeddings);
      totalTokens += result.tokens;
      totalCost += result.cost;

      // Pequeno delay entre batches para evitar rate limiting
      if (i < batches.length - 1) {
        await this.sleep(500);
      }
    }

    console.log(`[EmbeddingService] Batches concluídos: ${totalTokens} tokens, $${totalCost.toFixed(6)}`);

    return {
      embeddings: allEmbeddings,
      tokens: totalTokens,
      cost: totalCost,
      model: this.config.model,
    };
  }

  /**
   * Contar tokens de um texto usando tiktoken
   */
  countTokens(text: string): number {
    try {
      const tokens = this.encoding.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('[EmbeddingService] Erro ao contar tokens:', error);
      // Fallback: estimativa grosseira (1 token ~= 4 caracteres)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Calcular custo em USD
   * text-embedding-3-large: $0.13 / 1M tokens
   */
  calculateCost(tokens: number): number {
    const costPerMillionTokens = 0.13;
    return (tokens / 1_000_000) * costPerMillionTokens;
  }

  /**
   * Validar texto antes de gerar embedding
   */
  validateText(text: string): { valid: boolean; reason?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, reason: 'Texto vazio' };
    }

    const tokens = this.countTokens(text);
    if (tokens > this.config.maxTokens) {
      return { 
        valid: false, 
        reason: `Texto muito longo: ${tokens} tokens (máximo: ${this.config.maxTokens})` 
      };
    }

    return { valid: true };
  }

  /**
   * Retry com backoff exponencial
   * Útil para lidar com rate limiting da OpenAI
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries - 1;
        const isRetryableError = error?.status === 429 || error?.status >= 500;

        if (isLastAttempt || !isRetryableError) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[EmbeddingService] Tentativa ${attempt + 1} falhou, retry em ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw new Error('Não deveria chegar aqui');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obter configuração atual
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Limpar recursos (liberar encoding)
   */
  dispose(): void {
    if (this.encoding) {
      this.encoding.free();
    }
  }
}

// ===================================
// FACTORY E SINGLETON
// ===================================

/**
 * Factory function para criar instância do EmbeddingService
 * Usado em produção para criar singleton com configurações padrão
 */
export function createEmbeddingService(
  openaiClient?: OpenAI,
  config?: Partial<EmbeddingConfig>
): EmbeddingService {
  return new EmbeddingService(openaiClient, config);
}

// Singleton para uso em produção
const embeddingService = createEmbeddingService();

// Exportar classe para testes e singleton para produção
export { EmbeddingService };
export default embeddingService;
