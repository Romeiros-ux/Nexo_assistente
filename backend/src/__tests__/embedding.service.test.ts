/**
 * Testes para Embedding Service
 * Testa geração de embeddings e cálculos de custo/tokens
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ===================================
// MOCKS
// ===================================

// Mock do tiktoken
const mockEncode = jest.fn();
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: mockEncode,
  })),
}));

// Mock do OpenAI
const mockEmbeddingsCreate = jest.fn() as jest.MockedFunction<any>;
jest.mock('openai', () => {
  return class OpenAI {
    embeddings = {
      create: mockEmbeddingsCreate,
    };
  };
});

// ===================================
// FIXTURES
// ===================================

const mockEmbeddingVector = Array(1536).fill(0).map(() => Math.random());

const mockOpenAIResponse = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      index: 0,
      embedding: mockEmbeddingVector,
    },
  ],
  model: 'text-embedding-3-large',
  usage: {
    prompt_tokens: 10,
    total_tokens: 10,
  },
};

const mockBatchResponse = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      index: 0,
      embedding: mockEmbeddingVector,
    },
    {
      object: 'embedding',
      index: 1,
      embedding: mockEmbeddingVector,
    },
  ],
  model: 'text-embedding-3-large',
  usage: {
    prompt_tokens: 20,
    total_tokens: 20,
  },
};

// ===================================
// TESTES
// ===================================

describe('EmbeddingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup padrão dos mocks
    mockEncode.mockReturnValue([1, 2, 3, 4, 5]); // 5 tokens
    mockEmbeddingsCreate.mockResolvedValue(mockOpenAIResponse);
  });

  describe('Geração de Embedding Individual', () => {
    it('deve gerar embedding para texto válido', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbedding('Qual o calendário escolar?');

      expect(result).toHaveProperty('embedding');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('model');
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBe(1536);
    });

    it('deve calcular tokens corretamente', async () => {
      mockEncode.mockReturnValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 10 tokens

      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbedding('Texto de teste');

      expect(result.tokens).toBe(10);
    });

    it('deve calcular custo baseado em tokens', async () => {
      mockEncode.mockReturnValue(Array(100).fill(1)); // 100 tokens

      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbedding('Texto com muitos tokens');

      // text-embedding-3-large: $0.00013 per 1K tokens
      // 100 tokens = 0.1K tokens = $0.000013
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.001);
    });

    it('deve rejeitar texto vazio', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      await expect(
        embeddingService.generateEmbedding('')
      ).rejects.toThrow('Texto inválido');
    });

    it('deve incluir modelo na resposta', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbedding('Teste');

      expect(result.model).toBe('text-embedding-3-large');
    });
  });

  describe('Geração de Embeddings em Batch', () => {
    it('deve gerar embeddings para múltiplos textos', async () => {
      mockEmbeddingsCreate.mockResolvedValue(mockBatchResponse);

      const embeddingService = (await import('../services/embedding.service')).default;

      const texts = [
        'Primeiro texto',
        'Segundo texto',
      ];

      const result = await embeddingService.generateEmbeddingsBatch(texts);

      expect(result.embeddings).toBeInstanceOf(Array);
      expect(result.embeddings.length).toBe(2);
      expect(result.embeddings[0].length).toBe(1536);
    });

    it('deve calcular tokens totais do batch', async () => {
      mockEncode.mockReturnValue([1, 2, 3, 4, 5]); // 5 tokens por texto
      mockEmbeddingsCreate.mockResolvedValue(mockBatchResponse);

      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbeddingsBatch([
        'Texto 1',
        'Texto 2',
      ]);

      expect(result.tokens).toBe(10); // 5 + 5
    });

    it('deve calcular custo total do batch', async () => {
      mockEncode.mockReturnValue(Array(50).fill(1)); // 50 tokens por texto
      mockEmbeddingsCreate.mockResolvedValue(mockBatchResponse);

      const embeddingService = (await import('../services/embedding.service')).default;

      const result = await embeddingService.generateEmbeddingsBatch([
        'Texto 1',
        'Texto 2',
      ]);

      // 100 tokens total
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBeLessThan(0.001);
    });

    it('deve rejeitar array vazio', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      await expect(
        embeddingService.generateEmbeddingsBatch([])
      ).rejects.toThrow('Array de textos vazio');
    });

    it('deve rejeitar batch maior que o limite', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const largeArray = Array(51).fill('Texto'); // Limite padrão é 50

      await expect(
        embeddingService.generateEmbeddingsBatch(largeArray)
      ).rejects.toThrow('Batch muito grande');
    });
  });

  describe('Contagem de Tokens', () => {
    it('deve contar tokens usando tiktoken', async () => {
      mockEncode.mockReturnValue([1, 2, 3, 4, 5, 6, 7]); // 7 tokens

      const embeddingService = (await import('../services/embedding.service')).default;

      const tokens = embeddingService.countTokens('Este é um texto de teste');

      expect(tokens).toBe(7);
      expect(mockEncode).toHaveBeenCalledWith('Este é um texto de teste');
    });

    it('deve retornar 0 para texto vazio', async () => {
      mockEncode.mockReturnValue([]);

      const embeddingService = (await import('../services/embedding.service')).default;

      const tokens = embeddingService.countTokens('');

      expect(tokens).toBe(0);
    });
  });

  describe('Cálculo de Custo', () => {
    it('deve calcular custo para 1000 tokens', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const cost = embeddingService.calculateCost(1000);

      // text-embedding-3-large: $0.00013 per 1K tokens
      expect(cost).toBeCloseTo(0.00013, 7);
    });

    it('deve calcular custo para query pequena', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const cost = embeddingService.calculateCost(50);

      expect(cost).toBeCloseTo(0.0000065, 9);
    });

    it('deve retornar 0 para zero tokens', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const cost = embeddingService.calculateCost(0);

      expect(cost).toBe(0);
    });
  });

  describe('Validação de Texto', () => {
    it('deve validar texto normal', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const validation = embeddingService.validateText('Texto válido para embedding');

      expect(validation.valid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });

    it('deve rejeitar texto vazio', async () => {
      const embeddingService = (await import('../services/embedding.service')).default;

      const validation = embeddingService.validateText('');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBeDefined();
    });

    it('deve rejeitar texto muito longo', async () => {
      mockEncode.mockReturnValue(Array(9000).fill(1)); // 9000 tokens (acima do limite de 8191)

      const embeddingService = (await import('../services/embedding.service')).default;

      const longText = 'palavra '.repeat(9000);
      const validation = embeddingService.validateText(longText);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('tokens');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve propagar erro da API OpenAI', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));

      const embeddingService = (await import('../services/embedding.service')).default;

      await expect(
        embeddingService.generateEmbedding('Teste')
      ).rejects.toThrow('Falha ao gerar embedding');
    });

    it('deve incluir mensagem de erro original', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const embeddingService = (await import('../services/embedding.service')).default;

      await expect(
        embeddingService.generateEmbedding('Teste')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
