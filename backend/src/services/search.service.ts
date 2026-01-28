/**
 * FASE 2 - Search Service
 * 
 * Responsável pela busca semântica em documentos
 * - Gerar embedding da query
 * - Buscar chunks similares (match_chunks)
 * - Aplicar filtros de governança (perfil, unidade)
 * - Formatar resultados com citações
 * - Log de buscas para auditoria
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import embeddingService, { EmbeddingService } from './embedding.service';
import { DomainClassifierService } from './domain-classifier.service';
import { v4 as uuidv4 } from 'uuid';

// ===================================
// INTERFACES
// ===================================

export interface SearchQuery {
  query: string;
  user_id: string;
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_id?: string;
  filters?: {
    document_type?: string;
    similarity_threshold?: number;
    max_results?: number;
  };
}

export interface SearchResultChunk {
  chunk_id: string;
  content: string;
  metadata: any;
  similarity: number;
  source: {
    document_id: string;
    document_name: string;
    document_type: string;
  };
}

export interface SearchResult {
  success: boolean;
  query: string;
  results: SearchResultChunk[];
  total_results: number;
  tokens_used: number;
  search_cost: number;
  duration_ms: number;
  filters_applied: string[];
  error?: string;
}

export interface SearchLog {
  id: string;
  user_id: string;
  query: string;
  results_count: number;
  tokens_used: number;
  similarity_threshold: number;
  filters_applied: any;
  created_at: string;
}

// ===================================
// SEARCH SERVICE
// ===================================

interface SearchServiceConfig {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  defaultThreshold?: number;
  defaultMaxResults?: number;
}

class SearchService {
  private supabase: SupabaseClient;
  private embeddingService: EmbeddingService;
  private defaultThreshold: number;
  private defaultMaxResults: number;

  constructor(
    embeddingServiceInstance?: EmbeddingService,
    supabaseClient?: SupabaseClient,
    config?: SearchServiceConfig
  ) {
    // Use injected embedding service or default
    this.embeddingService = embeddingServiceInstance || embeddingService;

    // Use injected supabase client or create new one
    this.supabase = supabaseClient || createClient(
      config?.supabaseUrl || process.env.SUPABASE_URL!,
      config?.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Configurações padrão otimizadas para relevância
    // AJUSTADO: Threshold de 65% garante apenas resultados realmente relevantes
    // Valores testados: 0.030 (muito ruído) → 0.65 (alta qualidade)
    this.defaultThreshold = config?.defaultThreshold || 0.65; // 65% - apenas resultados relevantes
    this.defaultMaxResults = config?.defaultMaxResults || 8;   // Top 8 resultados

    console.log('[SearchService] Inicializado:', {
      defaultThreshold: this.defaultThreshold,
      defaultMaxResults: this.defaultMaxResults,
    });
  }

  /**
   * Calcula threshold dinâmico baseado no tamanho da query
   * Threshold ajustado para 65% garantindo alta relevância
   */
  private calculateDynamicThreshold(query: string, baseThreshold?: number): number {
    const threshold = baseThreshold || this.defaultThreshold;
    const wordCount = query.trim().split(/\s+/).length;

    // Query curta (< 6 palavras): reduz um pouco para capturar mais (65% -> 60%)
    if (wordCount < 6) {
      return Math.max(threshold - 0.05, 0.60); // Min 60%
    }

    // Query longa (>= 6 palavras): mantém 65%
    return threshold;
  }

  /**
   * Re-ranking dos resultados considerando múltiplos fatores
   * - Similaridade vetorial (peso 0.6)
   * - Tipo de documento (peso 0.25)
   * - Data de criação (peso 0.15)
   * 
   * Também garante diversificação de fontes quando possível
   */
  private reRankResults(results: any[], skipDiversification: boolean = false): any[] {
    if (!results || results.length === 0) return results;

    // Pesos para tipos de documentos (prioridade)
    const documentTypeWeights: { [key: string]: number } = {
      REPORT: 1.0,       // Dados estruturados (Excel) - prioridade máxima para consultas específicas
      LAW: 0.95,         // Leis municipais
      REGIMENTO: 0.9,
      PPP: 0.85,
      CALENDARIO: 0.8,
      CIRCULAR: 0.75,
      ATA: 0.7,
      OTHER: 0.65,       // Páginas web - útil para visão geral
      OUTRO: 0.6,
    };

    // Calcular score composto para cada resultado
    const rankedResults = results.map((result: any) => {
      // 1. Score de similaridade (60%)
      const similarityScore = result.similarity * 0.6;

      // 2. Score do tipo de documento (25%)
      const docTypeWeight = documentTypeWeights[result.document_type] || 0.7;
      const docTypeScore = docTypeWeight * 0.25;

      // 3. Score de recência (15%) - baseado em metadata se disponível
      let recencyScore = 0.075; // Valor médio se não tiver data
      if (result.chunk_metadata?.created_at) {
        const createdAt = new Date(result.chunk_metadata.created_at).getTime();
        const now = Date.now();
        const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
        
        // Documentos mais recentes têm score maior
        // Decai exponencialmente após 180 dias (6 meses)
        recencyScore = Math.max(0, 0.15 * Math.exp(-daysSinceCreation / 180));
      }

      // Score final
      const finalScore = similarityScore + docTypeScore + recencyScore;

      return {
        ...result,
        rerank_score: finalScore,
      };
    });

    // Ordenar por score composto (decrescente)
    rankedResults.sort((a, b) => b.rerank_score - a.rerank_score);

    // DIVERSIFICAÇÃO: Pular para queries de contagem (precisão crítica)
    if (skipDiversification) {
      console.log('[SearchService] ⚡ Diversificação desabilitada (modo contagem precisa)');
      return rankedResults; // Retorna TODOS os resultados sem limitação
    }
    
    // Para queries normais: Garantir mix de fontes quando há resultados de qualidade similar
    return this.diversifyResults(rankedResults);
  }

  /**
   * Diversifica resultados para evitar dominância de uma única fonte
   * Intercala resultados de diferentes document_types quando scores são próximos
   */
  private diversifyResults(rankedResults: any[]): any[] {
    if (rankedResults.length <= 3) return rankedResults;

    const diversified: any[] = [];
    const sourceTypeCounts: { [key: string]: number } = {};
    const maxPerSourceType = Math.ceil(rankedResults.length / 2); // Máximo 50% de um tipo

    // Primeira passada: adiciona resultados respeitando diversidade
    for (const result of rankedResults) {
      const sourceType = result.document_type || 'UNKNOWN';
      const currentCount = sourceTypeCounts[sourceType] || 0;

      // Se ainda não atingiu o limite deste tipo, ou se é muito relevante (similarity > 0.8), adiciona
      if (currentCount < maxPerSourceType || result.similarity > 0.8) {
        diversified.push(result);
        sourceTypeCounts[sourceType] = currentCount + 1;
      }
    }

    // Segunda passada: adiciona resultados que foram pulados (se houver espaço)
    const remaining = rankedResults.filter(r => !diversified.includes(r));
    diversified.push(...remaining.slice(0, Math.max(0, 8 - diversified.length)));

    return diversified;
  }

  /**
   * Busca semântica principal
   * Aplica filtros de governança baseado no perfil do usuário
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    console.log(`[SearchService] Busca iniciada:`, {
      query: searchQuery.query.substring(0, 100),
      user_profile: searchQuery.user_profile,
      unit_id: searchQuery.unit_id,
    });

    try {
      // 1. Validar query
      if (!searchQuery.query || searchQuery.query.trim().length === 0) {
        throw new Error('Query vazia');
      }

      if (searchQuery.query.length < 3) {
        throw new Error('Query muito curta (mínimo 3 caracteres)');
      }

      // 2. Gerar embedding da query
      const embeddingResult = await this.embeddingService.generateEmbedding(searchQuery.query);

      console.log(`[SearchService] Embedding gerado: ${embeddingResult.tokens} tokens`);

      // 3. Preparar parâmetros de busca com threshold dinâmico
      const baseThreshold = searchQuery.filters?.similarity_threshold || this.defaultThreshold;
      const threshold = this.calculateDynamicThreshold(searchQuery.query, baseThreshold);
      const maxResults = searchQuery.filters?.max_results || this.defaultMaxResults;

      console.log(`[SearchService] Threshold dinâmico calculado: ${threshold.toFixed(3)} (query: ${searchQuery.query.trim().split(/\s+/).length} palavras)`);

      // 4. Aplicar filtros de governança
      const { allowedDocumentTypes, filterByUnit } = this.applyGovernanceFilters(
        searchQuery.user_profile,
        searchQuery.unit_id
      );

      const filtersApplied: string[] = [];

      // 5. Chamar função match_chunks do banco com timeout aumentado
      // NOTA: Usando abortSignal para permitir timeout customizado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      let reRankedResults: any[] = [];
      
      try {
        const { data: matchResults, error: matchError } = await this.supabase.rpc('match_chunks', {
          query_embedding: embeddingResult.embedding,
          match_threshold: threshold,
          match_count: maxResults,
          filter_status: 'ACTIVE',
          filter_document_type: searchQuery.filters?.document_type || null,
          filter_unit_id: filterByUnit ? searchQuery.unit_id : null,
        }, {
          // @ts-ignore - Supabase client aceita AbortSignal mas não tem tipos
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (matchError) {
          throw new Error(`Erro na busca vetorial: ${matchError.message}`);
        }

        console.log(`[SearchService] ${matchResults?.length || 0} chunks encontrados (antes do re-ranking)`);
      
        // Log dos documentos retornados
        if (matchResults && matchResults.length > 0) {
          console.log('[SearchService] Top 5 documentos antes do re-ranking:');
          matchResults.slice(0, 5).forEach((r: any, i: number) => {
            console.log(`  ${i + 1}. ${r.document_name} - Similarity: ${(r.similarity * 100).toFixed(1)}%`);
          });
        }

        // 6. Re-ranking dos resultados
        reRankedResults = this.reRankResults(matchResults || []);
        console.log(`[SearchService] Re-ranking aplicado (top result score: ${reRankedResults[0]?.rerank_score?.toFixed(3) || 'N/A'})`);
        
        // 6.1. Se for query de autoridade, priorizar documento mais recente
        if (isAutoridadeQuery && reRankedResults.length > 0) {
          console.log('[SearchService] 👔 Ordenando por data (mais recente primeiro) para query de autoridades');
          reRankedResults.sort((a: any, b: any) => {
            // Priorizar por data de upload (mais recente primeiro)
            const dateA = new Date(a.uploaded_at || 0).getTime();
            const dateB = new Date(b.uploaded_at || 0).getTime();
            return dateB - dateA; // Decrescente (mais recente primeiro)
          });
          
          if (reRankedResults[0]) {
            console.log(`[SearchService] 📅 Documento mais recente selecionado: ${reRankedResults[0].document_name} (${reRankedResults[0].uploaded_at})`);
          }
        }
        
        // Log após re-ranking
        if (reRankedResults && reRankedResults.length > 0) {
          console.log('[SearchService] Top 5 documentos APÓS re-ranking:');
          reRankedResults.slice(0, 5).forEach((r: any, i: number) => {
            console.log(`  ${i + 1}. ${r.document_name} - Score: ${r.rerank_score.toFixed(3)} (sim: ${(r.similarity * 100).toFixed(1)}%, type: ${r.document_type})`);
          });
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Timeout na busca vetorial após 30 segundos. Por favor, execute o script SQL de otimização.');
        }
        throw error;
      }

      // 7. Filtrar por tipo de documento (governança)
      let filteredResults = reRankedResults || [];

      if (allowedDocumentTypes.length > 0) {
        filteredResults = filteredResults.filter((r: any) =>
          allowedDocumentTypes.includes(r.document_type)
        );
        filtersApplied.push(`document_type IN [${allowedDocumentTypes.join(', ')}]`);
      }

      if (filterByUnit && searchQuery.unit_id) {
        filtersApplied.push(`unit_id = ${searchQuery.unit_id}`);
      }

      filtersApplied.push(`similarity >= ${threshold}`);
      filtersApplied.push(`status = ACTIVE`);

      // 8. Formatar resultados
      const formattedResults: SearchResultChunk[] = filteredResults.map((r: any) => ({
        chunk_id: r.chunk_id,
        content: r.chunk_content,
        metadata: r.chunk_metadata,
        similarity: r.similarity,
        source: {
          document_id: r.document_id,
          document_name: r.document_name,
          document_type: r.document_type,
        },
      }));

      const duration = Date.now() - startTime;

      // 8. Log da busca (auditoria)
      await this.logSearch({
        user_id: searchQuery.user_id,
        query: searchQuery.query,
        results_count: formattedResults.length,
        tokens_used: embeddingResult.tokens,
        similarity_threshold: threshold,
        filters_applied: {
          profile: searchQuery.user_profile,
          document_types: allowedDocumentTypes,
          unit_filter: filterByUnit,
        },
      });

      console.log(`[SearchService] ✅ Busca concluída:`, {
        results: formattedResults.length,
        tokens: embeddingResult.tokens,
        cost: `$${embeddingResult.cost.toFixed(6)}`,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        query: searchQuery.query,
        results: formattedResults,
        total_results: formattedResults.length,
        tokens_used: embeddingResult.tokens,
        search_cost: embeddingResult.cost,
        duration_ms: duration,
        filters_applied: filtersApplied,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[SearchService] ❌ Erro na busca:', error);

      return {
        success: false,
        query: searchQuery.query,
        results: [],
        total_results: 0,
        tokens_used: 0,
        search_cost: 0,
        duration_ms: duration,
        filters_applied: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * BUSCA INTELIGENTE COM ROTEAMENTO POR DOMÍNIO
   * 
   * Fluxo em 3 etapas:
   * 1. LLM classifica a query em domínio/subdomínio
   * 2. Busca especializada no domínio identificado
   * 3. Se não encontrar, expande para domínios relacionados
   */
  async searchWithDomainRouting(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    console.log(`[SearchService] 🧠 Busca inteligente iniciada:`, {
      query: searchQuery.query.substring(0, 100),
      user_profile: searchQuery.user_profile,
    });

    try {
      // PRÉ-CLASSIFICAÇÃO: Detectar queries específicas de Diário Oficial ANTES da LLM
      // Isso garante que queries como "Decreto 3159" vão para DIARIO_OFICIAL, não LEGISLACAO
      const isAtoNumeroQuery = this.isAtoNumeroQuery(searchQuery.query);
      const isTextoCompletoQuery = this.isTextoCompletoQuery(searchQuery.query);
      const isContratoLicitacaoQuery = this.isContratoLicitacaoQuery(searchQuery.query);
      const isAutoridadeQuery = this.isAutoridadeQuery(searchQuery.query);
      const isDiarioOficialQuery = isAtoNumeroQuery || isTextoCompletoQuery || isContratoLicitacaoQuery || isAutoridadeQuery;
      
      let classification: any;
      
      if (isDiarioOficialQuery) {
        // Forçar classificação como DIARIO_OFICIAL para queries específicas
        console.log('[SearchService] 📜 PRÉ-CLASSIFICAÇÃO: Query de Diário Oficial detectada');
        let subdomain = 'INDICE_ATOS'; // default
        if (isTextoCompletoQuery) subdomain = 'TEXTOS_COMPLETOS';
        else if (isContratoLicitacaoQuery) subdomain = 'CONTRATOS_LICITACOES';
        else if (isAutoridadeQuery) {
          subdomain = 'TEXTOS_COMPLETOS';
          console.log('[SearchService] 👔 Query sobre AUTORIDADES detectada - priorizando documento mais recente');
        }
        
        classification = {
          domain: 'DIARIO_OFICIAL',
          subdomain: subdomain,
          confidence: 0.95,
          filters: { documentType: 'OTHER' },
          reasoning: isAutoridadeQuery 
            ? 'Query sobre autoridades governamentais detectada - buscando no documento mais recente'
            : 'Query específica de Diário Oficial detectada por padrões (decreto/portaria/lei/contrato/licitação com número)'
        };
        
        console.log(`[SearchService] ✅ Classificação forçada:`, {
          domain: classification.domain,
          subdomain: classification.subdomain,
          confidence: classification.confidence.toFixed(2),
          reasoning: classification.reasoning
        });
      } else {
        // ETAPA 1: Classificar query com LLM
        console.log('[SearchService] 🔍 Etapa 1: Classificando query...');
        classification = await DomainClassifierService.classifyQuery(searchQuery.query);
        
        console.log(`[SearchService] ✅ Query classificada:`, {
          domain: classification.domain,
          subdomain: classification.subdomain,
          confidence: classification.confidence.toFixed(2),
          filters: classification.filters,
          reasoning: classification.reasoning
        });
      }

      // ETAPA 2: Busca especializada no domínio
      console.log('[SearchService] 🎯 Etapa 2: Busca especializada no domínio...');
      
      const embeddingResult = await this.embeddingService.generateEmbedding(searchQuery.query);
      
      // Detectar se é query de contagem/agregação
      const isCountQuery = this.isCountOrAggregationQuery(searchQuery.query);
      
      // Detectar se é query de cargo/matrícula específica
      const isCargoMatriculaQuery = this.isCargoOrMatriculaQuery(searchQuery.query);
      
      // Ajustar threshold baseado no tipo de documento
      // Dados tabulares (RH) tem menor similaridade semântica
      let threshold = searchQuery.filters?.similarity_threshold || this.defaultThreshold;
      let maxResults = searchQuery.filters?.max_results || this.defaultMaxResults;
      
      // Para RECURSOS_HUMANOS com query de contagem, PRIORIZAR arquivo CONTAGEM
      let targetSubdomain = classification.subdomain;
      if (isCountQuery && classification.domain === 'RECURSOS_HUMANOS') {
        console.log('[SearchService] 🎯 Query de contagem em RH detectada');
        console.log('[SearchService] 📊 Priorizando busca em subdomain=CONTAGEM (dados agregados)');
        targetSubdomain = 'CONTAGEM';
        maxResults = 100; // Arquivo de contagem é pequeno (572 linhas, ~169 chunks)
        threshold = 0.3;
      } else if (isCargoMatriculaQuery && classification.domain === 'RECURSOS_HUMANOS') {
        console.log('[SearchService] 🎯 Query de cargo/matrícula detectada');
        console.log('[SearchService] 🔍 Priorizando busca em subdomain=MATRICULAS (índice otimizado)');
        targetSubdomain = 'MATRICULAS';
        maxResults = 50; // Arquivo otimizado com 4 colunas
        threshold = 0.3;
      } else if (classification.domain === 'RECURSOS_HUMANOS' && classification.subdomain === 'SERVIDORES') {
        threshold = 0.3; // Threshold mais baixo para dados CSV/tabulares
        console.log('[SearchService] 📊 Ajustando threshold para dados tabulares: 0.3');
        
        // Para queries de contagem em dados tabulares, retornar MUITOS mais chunks
        // CSV tem 7,453 funcionários, 6,615 chunks. Cobrir ~1200-1600 registros.
        // LIMITE: Max 400 chunks para não exceder 128k tokens do GPT-4o-mini
        if (isCountQuery) {
          maxResults = 400; // Retornar grande volume para contagem (limitado por contexto LLM)
          console.log('[SearchService] 🔢 Query de contagem detectada, aumentando match_count para 400');
          console.log('[SearchService] ⚠️  MODO PRECISÃO: Contagem para relatórios oficiais');
        } else {
          // Para queries de busca específica (não contagem), aumentar para 50 chunks
          // Necessário porque busca por cargo específico pode ter baixa similaridade semântica
          maxResults = 50;
          console.log('[SearchService] 🔍 Query de busca em SERVIDORES, aumentando match_count para 50');
        }
      }
      
      // Para DIARIO_OFICIAL, ajustar parâmetros
      // NOTA: subdomain já foi definido na pré-classificação baseado em padrões
      if (classification.domain === 'DIARIO_OFICIAL') {
        threshold = 0.3; // Threshold mais baixo para dados estruturados
        console.log('[SearchService] 📜 Configurando busca em Diário Oficial');
        console.log(`[SearchService] 🎯 Subdomain selecionado: ${classification.subdomain}`);
        
        targetSubdomain = classification.subdomain;
        
        // Ajustar maxResults baseado no subdomain
        if (classification.subdomain === 'INDICE_ATOS') {
          maxResults = 30; // Índice pequeno (185 atos, ~33 chunks)
        } else if (classification.subdomain === 'CONTRATOS_LICITACOES') {
          maxResults = 50; // Arquivo de contratos (233 documentos, ~109 chunks)
        } else if (classification.subdomain === 'TEXTOS_COMPLETOS') {
          maxResults = 100; // Arquivo grande (337 chunks de texto integral)
        }
      }

      // Aplicar filtros de governança (não usados nesta versão simplificada)
      // const { allowedDocumentTypes, filterByUnit } = this.applyGovernanceFilters(
      //   searchQuery.user_profile,
      //   searchQuery.unit_id
      // );

      // Chamar função de busca por domínio
      console.log('[SearchService] 🔧 DEBUG: Parâmetros da busca SQL:', {
        filter_domain: classification.domain,
        filter_subdomain: targetSubdomain,
        filter_year: classification.filters?.year,
        filter_education_stage: classification.filters?.educationStage,
        match_threshold: threshold,
        match_count: maxResults,
      });
      
      const { data: domainResults, error: domainError } = await this.supabase.rpc(
        'match_chunks_by_domain',
        {
          query_embedding: embeddingResult.embedding,
          match_threshold: threshold,
          match_count: maxResults,
          filter_domain: classification.domain,
          filter_subdomain: targetSubdomain,
          filter_document_type: searchQuery.filters?.document_type || null,
          filter_year: classification.filters?.year || null,
          filter_education_stage: classification.filters?.educationStage || null,
        }
      );

      if (domainError) {
        console.warn(`[SearchService] ⚠️ Erro na busca por domínio: ${domainError.message}`);
        // Fallback para busca tradicional
        return this.search(searchQuery);
      }

      console.log(`[SearchService] 📊 Busca especializada retornou ${domainResults?.length || 0} resultados`);

      // Se encontrou resultados suficientes, retornar
      if (domainResults && domainResults.length >= 3) {
        console.log('[SearchService] ✅ Resultados suficientes encontrados no domínio principal');
        
        const reRankedResults = this.reRankResults(domainResults, isCountQuery);
        
        const formattedResults: SearchResultChunk[] = reRankedResults.map((r: any) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          metadata: {
            domain: r.domain,
            subdomain: r.subdomain,
            year: r.metadata_year,
            education_stage: r.education_stage
          },
          similarity: r.similarity,
          source: {
            document_id: r.document_id,
            document_name: r.document_name,
            document_type: r.document_type,
          },
        }));

        const duration = Date.now() - startTime;

        return {
          success: true,
          query: searchQuery.query,
          results: formattedResults,
          total_results: formattedResults.length,
          tokens_used: embeddingResult.tokens,
          search_cost: 0.0001 * embeddingResult.tokens,
          duration_ms: duration,
          filters_applied: [
            `domain=${classification.domain}`,
            `subdomain=${classification.subdomain}`,
            ...(classification.filters?.year ? [`year=${classification.filters.year}`] : []),
            ...(classification.filters?.educationStage ? [`stage=${classification.filters.educationStage}`] : []),
          ],
        };
      }

      // ETAPA 3: Fallback - buscar em domínios relacionados
      console.log('[SearchService] 🔄 Etapa 3: Expandindo busca para domínios relacionados...');
      
      const alternativeDomains = DomainClassifierService.suggestAlternativeDomains(
        classification.domain
      );

      console.log(`[SearchService] 🔍 Domínios alternativos: ${alternativeDomains.join(', ')}`);

      let expandedResults: any[] = domainResults || [];

      for (const altDomain of alternativeDomains.slice(0, 2)) {
        const { data: altResults } = await this.supabase.rpc('match_chunks_by_domain', {
          query_embedding: embeddingResult.embedding,
          match_threshold: threshold,
          match_count: Math.ceil(maxResults / 2),
          filter_domain: altDomain,
          filter_subdomain: null,
          filter_document_type: null,
          filter_year: null,
          filter_education_stage: null,
        });

        if (altResults && altResults.length > 0) {
          console.log(`[SearchService] ➕ +${altResults.length} resultados de ${altDomain}`);
          expandedResults.push(...altResults);
        }
      }

      // Re-ranking dos resultados combinados
      const reRankedResults = this.reRankResults(expandedResults, isCountQuery);
      
      const formattedResults: SearchResultChunk[] = reRankedResults.slice(0, maxResults).map((r: any) => ({
        chunk_id: r.chunk_id,
        content: r.content,
        metadata: {
          domain: r.domain,
          subdomain: r.subdomain,
          year: r.metadata_year,
          education_stage: r.education_stage
        },
        similarity: r.similarity,
        source: {
          document_id: r.document_id,
          document_name: r.document_name,
          document_type: r.document_type,
        },
      }));

      const duration = Date.now() - startTime;

      console.log(`[SearchService] ✅ Busca inteligente concluída: ${formattedResults.length} resultados em ${duration}ms`);

      return {
        success: true,
        query: searchQuery.query,
        results: formattedResults,
        total_results: formattedResults.length,
        tokens_used: embeddingResult.tokens,
        search_cost: 0.0001 * embeddingResult.tokens,
        duration_ms: duration,
        filters_applied: [
          `primary_domain=${classification.domain}`,
          `alternative_domains=${alternativeDomains.join(',')}`,
        ],
      };

    } catch (error: any) {
      console.error('[SearchService] ❌ Erro na busca inteligente:', error);

      // Fallback para busca tradicional em caso de erro
      console.log('[SearchService] 🔄 Fallback para busca tradicional...');
      return this.search(searchQuery);
    }
  }

  /**
   * Aplicar regras de governança baseadas no perfil
   * 
   * REGRAS:
   * - DIRETOR: Pode ver apenas documentos da sua unidade
   * - COMISSAO: Pode ver documentos de todas as unidades
   * - SECRETARIA: Acesso total (gestão municipal)
   * - TI: Acesso total (administração)
   */
  private applyGovernanceFilters(
    profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI',
    unitId?: string
  ): {
    allowedDocumentTypes: string[];
    filterByUnit: boolean;
  } {
    switch (profile) {
      case 'DIRETOR':
        // Diretor: apenas sua unidade
        if (!unitId) {
          console.warn('[SearchService] DIRETOR sem unit_id, acesso negado');
          return { allowedDocumentTypes: [], filterByUnit: true };
        }
        return {
          allowedDocumentTypes: [], // Todos os tipos, mas filtrado por unidade
          filterByUnit: true,
        };

      case 'COMISSAO':
        // Comissão: todas as unidades
        return {
          allowedDocumentTypes: [], // Todos os tipos
          filterByUnit: false,      // Todas as unidades
        };

      case 'SECRETARIA':
        // Secretaria: acesso total (gestão municipal)
        return {
          allowedDocumentTypes: [], // Todos os tipos
          filterByUnit: false,      // Todas as unidades
        };

      case 'TI':
        // TI: acesso total
        return {
          allowedDocumentTypes: [], // Todos os tipos
          filterByUnit: false,      // Todas as unidades
        };

      default:
        // Acesso negado para perfis desconhecidos
        console.warn('[SearchService] Perfil desconhecido:', profile);
        return {
          allowedDocumentTypes: [],
          filterByUnit: true,
        };
    }
  }

  /**
   * Buscar chunks de um documento específico
   * Útil para navegação de documento completo
   */
  async getDocumentChunks(documentId: string): Promise<any> {
    try {
      // Verificar se documento está ativo
      const { data: document, error: docError } = await this.supabase
        .from('documents')
        .select('id, name, status')
        .eq('id', documentId)
        .eq('status', 'ACTIVE')
        .single();

      if (docError || !document) {
        throw new Error('Documento não encontrado ou inativo');
      }

      // Buscar versão indexada
      const { data: version, error: versionError } = await this.supabase
        .from('document_versions')
        .select('id')
        .eq('document_id', documentId)
        .eq('indexed', true)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !version) {
        throw new Error('Documento não possui versão indexada');
      }

      // Buscar chunks
      const { data: chunks, error: chunksError } = await this.supabase
        .from('document_chunks')
        .select('id, content, chunk_index, metadata')
        .eq('document_version_id', version.id)
        .order('chunk_index', { ascending: true });

      if (chunksError) {
        throw new Error(`Erro ao buscar chunks: ${chunksError.message}`);
      }

      return {
        document,
        chunks: chunks || [],
      };

    } catch (error) {
      console.error('[SearchService] Erro ao buscar chunks do documento:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de buscas do usuário
   * Útil para análise e melhorias
   */
  async getSearchHistory(userId: string, limit: number = 50): Promise<SearchLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('search_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('[SearchService] Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Buscar queries populares (análise agregada)
   * Útil para insights sobre o que usuários procuram
   */
  async getPopularQueries(limit: number = 20): Promise<any[]> {
    try {
      // Agregar queries mais buscadas
      const { data, error } = await this.supabase
        .from('search_logs')
        .select('query')
        .order('created_at', { ascending: false })
        .limit(1000); // Últimas 1000 buscas

      if (error || !data) {
        return [];
      }

      // Contar ocorrências
      const queryCounts = new Map<string, number>();
      data.forEach((log: any) => {
        const normalized = log.query.toLowerCase().trim();
        queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1);
      });

      // Ordenar e limitar
      const popular = Array.from(queryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));

      return popular;

    } catch (error) {
      console.error('[SearchService] Erro ao buscar queries populares:', error);
      return [];
    }
  }

  /**
   * Log de busca (auditoria)
   * Persiste no banco para análise futura
   */
  private async logSearch(log: Omit<SearchLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('search_logs')
        .insert({
          id: uuidv4(),
          user_id: log.user_id,
          query: log.query,
          results_count: log.results_count,
          tokens_used: log.tokens_used,
          similarity_threshold: log.similarity_threshold,
          filters_applied: log.filters_applied,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[SearchService] Erro ao salvar log:', error);
        // Não lançar erro - log não deve bloquear busca
      }

    } catch (error) {
      console.error('[SearchService] Erro ao salvar log:', error);
      // Silencioso - log é opcional
    }
  }

  /**
   * Detectar se a query é de contagem ou agregação
   * Exemplos: "quantos", "quantas", "total de", "número de"
   * IMPORTANTE: Para relatórios oficiais da Secretaria de Educação
   */
  private isCountOrAggregationQuery(query: string): boolean {
    const countPatterns = [
      /\bquantos\b/i,
      /\bquantas\b/i,
      /\bquantidade\b/i,
      /\btotal\s+de\b/i,
      /\bnúmero\s+de\b/i,
      /\bcontar\b/i,
      /\blistar\s+todos\b/i,
      /\blistar\s+todas\b/i,
      /\bmédia\b/i,
      /\bsoma\b/i,
    ];
    
    return countPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detecta se a query é sobre cargo específico ou matrícula
   */
  private isCargoOrMatriculaQuery(query: string): boolean {
    const cargoMatriculaPatterns = [
      // Queries sobre cargos específicos
      /\bprefeito\b/i,
      /\bvice-prefeito\b/i,
      /\bvereador\b/i,
      /\bsecretário\b/i,
      /\bsecretária\b/i,
      /\bqual\s+(o\s+)?cargo\b/i,
      /\bnome\s+do\s+prefeito\b/i,
      /\bquem\s+é\s+(o|a)\s+(prefeito|secretário|vereador)\b/i,
      
      // Queries sobre matrícula
      /\bmatrícula\b/i,
      /\bmatricula\b/i,
      /\bqual\s+(a\s+)?matrícula\b/i,
      /\bnúmero\s+de\s+matrícula\b/i,
      /\bregistro\s+funcional\b/i,
    ];
    
    return cargoMatriculaPatterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Detecta se a query é sobre número de ato (decreto, portaria, lei, edital)
   * Exemplos: "Decreto 3159", "Portaria 38", "Qual o edital de locação de vans?"
   */
  private isAtoNumeroQuery(query: string): boolean {
    const atoPatterns = [
      /\bdecreto\s+n?[º°]?\s*\d+/i,
      /\bportaria\s+n?[º°]?\s*\d+/i,
      /\blei\s+n?[º°]?\s*\d+/i,
      /\bedital\s+n?[º°]?\s*\d+/i,
      /\bqual\s+(o\s+)?número\s+d[oa]\s+(decreto|portaria|lei|edital)/i,
      /\bqual\s+(decreto|portaria|lei|edital)/i,
      /\bnúmero\s+d[oa]\s+ato/i,
    ];
    
    return atoPatterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Detecta se a query é sobre texto completo de publicação
   * Exemplos: "Quero ler o decreto", "O que diz a portaria", "Mostrar texto completo"
   */
  private isTextoCompletoQuery(query: string): boolean {
    const textoCompletoPatterns = [
      /\b(ler|mostrar|exibir|ver)\s+(o\s+)?(texto|conteúdo|teor|íntegra)/i,
      /\bquero\s+ler\s+(o\s+)?(decreto|portaria|lei)/i,
      /\b(texto\s+)?complet[oa]\s+d[oa]/i,
      /\bo\s+que\s+diz\s+(o\s+)?(decreto|portaria|lei)/i,
      /\bíntegra\s+d[oa]/i,
      /\bconteúdo\s+d[oa]\s+(decreto|portaria|lei)/i,
      /\bleia\s+(o\s+)?(decreto|portaria)/i,
    ];
    
    return textoCompletoPatterns.some(pattern => pattern.test(query));
  }
  
  /**
   * Detecta se a query é sobre contratos ou licitações
   * Exemplos: "Valor do contrato", "Empresa vencedora", "Quem venceu a licitação"
   */
  private isContratoLicitacaoQuery(query: string): boolean {
    const contratoPatterns = [
      /\bcontrato\s+n?[º°]?\s*\d+/i,
      /\blicitação\s+(para|de)/i,
      /\bata\s+de\s+registro/i,
      /\bvalor\s+d[oa]\s+contrato/i,
      /\bempresa\s+(vencedora|contratada)/i,
      /\bquem\s+venceu\s+a\s+licitação/i,
      /\bpregão/i,
      /\btermo\s+aditivo/i,
      /\bcnpj\s+d[oa]\s+empresa/i,
      /\bobjeto\s+d[oa]\s+contrato/i,
    ];
    
    return contratoPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detecta se a query é sobre autoridades governamentais (prefeito, vice, secretários)
   * Essas informações estão na segunda página dos PDFs e devem priorizar documento mais recente
   */
  private isAutoridadeQuery(query: string): boolean {
    const autoridadePatterns = [
      /\b(quem\s+é|qual\s+é|nome\s+d[oa])\s+(o\s+)?prefeito/i,
      /\bprefeito\s+(de\s+)?saquarema/i,
      /\bvice[-\s]?prefeito/i,
      /\bsecret[áa]ri[oa]\s+(de|da|do)\s+/i,
      /\bquem\s+é\s+o\s+secret[áa]rio/i,
      /\bsecret[áa]ri[oa]\s+municipal/i,
      /\bgestão\s+municipal/i,
      /\bgoverno\s+municipal/i,
      /\bcargo\s+de\s+secret[áa]rio/i,
      /\bsecret[áa]rios\s+municipais/i,
    ];
    
    return autoridadePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Obter estatísticas de uso de busca
   */
  async getSearchStats(): Promise<any> {
    try {
      // Total de buscas
      const { count: totalSearches, error: countError } = await this.supabase
        .from('search_logs')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Erro ao contar buscas: ${countError.message}`);
      }

      // Buscas por perfil
      const { data: resultsData, error: resultsError } = await this.supabase
        .from('search_logs')
        .select('results_count');

      if (resultsError) {
        throw new Error(`Erro ao buscar results: ${resultsError.message}`);
      }

      // Tokens totais usados
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('search_logs')
        .select('tokens_used');

      if (tokenError) {
        throw new Error(`Erro ao buscar tokens: ${tokenError.message}`);
      }

      const totalTokens = tokenData?.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0) || 0;
      const searchCost = this.embeddingService.calculateCost(totalTokens);

      return {
        total_searches: totalSearches || 0,
        total_tokens: totalTokens,
        total_cost: searchCost,
        average_results: resultsData?.length ? 
          resultsData.reduce((sum: number, log: any) => sum + (log.results_count || 0), 0) / resultsData.length : 0,
      };

    } catch (error) {
      console.error('[SearchService] Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

// Factory function para produção
export function createSearchService(
  embeddingServiceInstance?: EmbeddingService,
  supabaseClient?: SupabaseClient,
  config?: SearchServiceConfig
): SearchService {
  return new SearchService(embeddingServiceInstance, supabaseClient, config);
}

// Singleton para produção
const searchService = createSearchService();

// Export both class and singleton
export { SearchService };
export default searchService;
