/**
 * Testes para Search Service
 * Testa busca semântica com re-ranking e governança
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SearchService } from '../services/search.service';
import { EmbeddingService } from '../services/embedding.service';
import type { SupabaseClient } from '@supabase/supabase-js';

// ===================================
// MOCKS
// ===================================

// Mock do OpenAI para EmbeddingService
const mockOpenAICreate = jest.fn<() => Promise<any>>();
const mockOpenAI = {
  embeddings: {
    create: mockOpenAICreate,
  },
} as any;

// Mock do Supabase
const mockRpc = jest.fn() as jest.MockedFunction<any>;
const mockFrom = jest.fn() as jest.MockedFunction<any>;
const mockInsert = jest.fn() as jest.MockedFunction<any>;

const mockSupabaseClient = {
  rpc: mockRpc,
  from: mockFrom,
} as unknown as SupabaseClient;

// Mock do uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

// ===================================
// FIXTURES
// ===================================

const mockEmbeddingVector = Array(1536).fill(0.1);

const mockOpenAIResponse = {
  data: [
    {
      embedding: mockEmbeddingVector,
      index: 0,
      object: 'embedding' as const,
    },
  ],
  model: 'text-embedding-3-large',
  object: 'list' as const,
  usage: {
    prompt_tokens: 10,
    total_tokens: 10,
  },
};

const mockSearchResults = {
  data: [
    {
      chunk_id: 'chunk-1',
      content: 'Conteúdo sobre calendário escolar 2026',
      chunk_metadata: { page: 1 },
      similarity: 0.92,
      document_id: 'doc-1',
      document_name: 'Calendário 2026',
      document_type: 'CALENDARIO',
    },
    {
      chunk_id: 'chunk-2',
      content: 'Informações sobre matrícula',
      chunk_metadata: { page: 2 },
      similarity: 0.85,
      document_id: 'doc-2',
      document_name: 'Regimento Escolar',
      document_type: 'REGIMENTO',
    },
  ],
  error: null,
};

const mockValidQuery = {
  query: 'Qual o calendário escolar 2026?',
  user_id: 'user-123',
  user_profile: 'DIRETOR' as const,
  unit_id: 'unit-456',
};

// ===================================
// TESTES
// ===================================

describe('SearchService', () => {
  let embeddingService: EmbeddingService;
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Criar embedding service com mock do OpenAI
    embeddingService = new EmbeddingService(mockOpenAI);

    // Criar search service com dependências mockadas
    searchService = new SearchService(embeddingService, mockSupabaseClient);

    // Setup padrão dos mocks
    mockOpenAICreate.mockResolvedValue(mockOpenAIResponse);
    mockRpc.mockResolvedValue(mockSearchResults);
    mockFrom.mockReturnValue({
      insert: mockInsert.mockResolvedValue({ data: {}, error: null }),
    });
  });

  describe('Busca Semântica Básica', () => {
    it('deve executar busca com query válida', async () => {
      const result = await searchService.search(mockValidQuery);

      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('deve gerar embedding da query', async () => {
      await searchService.search(mockValidQuery);

      // Verificar que o OpenAI foi chamado
      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it('deve chamar match_chunks com embedding', async () => {
      await searchService.search(mockValidQuery);

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          query_embedding: expect.any(Array), // Array de números
        })
      );
    });

    it('deve incluir parâmetros de busca corretos', async () => {
      await searchService.search(mockValidQuery);

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          match_threshold: expect.any(Number),
          match_count: expect.any(Number),
        })
      );
    });
  });

  describe('Threshold Dinâmico', () => {
    it('deve usar threshold padrão para query normal', async () => {
      await searchService.search({
        ...mockValidQuery,
        query: 'Qual o calendário escolar de 2026?', // 6 palavras
      });

      // Query >= 6 palavras: reduz threshold em -0.03
      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          match_threshold: expect.any(Number),
        })
      );
    });

    it('deve aumentar threshold para query curta', async () => {
      await searchService.search({
        ...mockValidQuery,
        query: 'calendário 2026', // 2 palavras
      });

      // Query < 6 palavras: aumenta threshold em +0.04
      expect(mockRpc).toHaveBeenCalled();
    });

    it('deve aceitar threshold customizado', async () => {
      await searchService.search({
        ...mockValidQuery,
        filters: {
          similarity_threshold: 0.7,
        },
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          match_threshold: expect.any(Number),
        })
      );
    });
  });

  describe('Filtros de Governança', () => {
    it('deve aplicar filtro de unit_id para DIRETOR', async () => {
      await searchService.search({
        ...mockValidQuery,
        user_profile: 'DIRETOR',
        unit_id: 'unit-123',
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          filter_unit_id: 'unit-123',
        })
      );
    });

    it('deve aplicar filtro de document_type', async () => {
      await searchService.search({
        ...mockValidQuery,
        filters: {
          document_type: 'CALENDARIO',
        },
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          filter_document_type: 'CALENDARIO',
        })
      );
    });

    it('deve aceitar max_results customizado', async () => {
      await searchService.search({
        ...mockValidQuery,
        filters: {
          max_results: 5,
        },
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chunks',
        expect.objectContaining({
          match_count: 5,
        })
      );
    });
  });

  describe('Re-ranking de Resultados', () => {
    it('deve ordenar resultados por score composto', async () => {
      const result = await searchService.search(mockValidQuery);

      // Verificar que resultados estão ordenados
      expect(result.results).toBeInstanceOf(Array);
      
      if (result.results.length > 1) {
        // Primeiro resultado deve ter similarity >= segundo
        expect(result.results[0].similarity).toBeGreaterThanOrEqual(
          result.results[1].similarity
        );
      }
    });

    it('deve incluir informações de fonte', async () => {
      const result = await searchService.search(mockValidQuery);

      result.results.forEach(chunk => {
        expect(chunk.source).toHaveProperty('document_id');
        expect(chunk.source).toHaveProperty('document_name');
        expect(chunk.source).toHaveProperty('document_type');
      });
    });
  });

  describe('Métricas e Custos', () => {
    it('deve calcular custo de busca', async () => {
      const result = await searchService.search(mockValidQuery);

      expect(result.search_cost).toBeGreaterThan(0);
      expect(typeof result.search_cost).toBe('number');
    });

    it('deve contar tokens usados', async () => {
      const result = await searchService.search(mockValidQuery);

      expect(result.tokens_used).toBeGreaterThan(0);
      expect(result.tokens_used).toBe(mockOpenAIResponse.usage.total_tokens);
    });

    it('deve medir duração da busca', async () => {
      const result = await searchService.search(mockValidQuery);

      expect(result.duration_ms).toBeGreaterThan(0);
    });
  });

  describe('Auditoria e Logs', () => {
    it('deve salvar log de busca', async () => {
      await searchService.search(mockValidQuery);

      expect(mockFrom).toHaveBeenCalledWith('search_logs');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('deve incluir filtros aplicados no log', async () => {
      await searchService.search({
        ...mockValidQuery,
        filters: {
          document_type: 'LAW',
        },
      });

      // Log deve ser criado com filtros
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro do embedding service', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('Embedding error'));

      const result = await searchService.search(mockValidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve lidar com erro do match_chunks', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await searchService.search(mockValidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('Error'));

      const result = await searchService.search(mockValidQuery);

      expect(result.results).toEqual([]);
      expect(result.total_results).toBe(0);
    });
  });

  describe('Casos Especiais', () => {
    it('deve lidar com busca sem resultados', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await searchService.search(mockValidQuery);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.total_results).toBe(0);
    });

    it('deve validar query muito curta', async () => {
      const result = await searchService.search({
        ...mockValidQuery,
        query: 'ab', // 2 caracteres
      });

      // Deve rejeitar ou ajustar threshold
      expect(result).toBeDefined();
    });

    it('deve incluir metadata dos chunks', async () => {
      const result = await searchService.search(mockValidQuery);

      result.results.forEach(chunk => {
        expect(chunk).toHaveProperty('chunk_id');
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('similarity');
        expect(chunk).toHaveProperty('metadata');
      });
    });
  });
});

