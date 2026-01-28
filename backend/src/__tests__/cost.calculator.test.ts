/**
 * Testes para cálculos de custo
 * Testa estimativas de custo para OpenAI
 */

import { describe, it, expect } from '@jest/globals';

// Constantes de custo OpenAI (GPT-4o-mini)
const COST_PER_1K_TOKENS_INPUT = 0.00015;
const COST_PER_1K_TOKENS_OUTPUT = 0.0006;
const COST_PER_1K_TOKENS_EMBEDDING = 0.00002;

/**
 * Calcula custo de tokens para o modelo GPT-4o-mini
 */
function calculateChatCost(tokensInput: number, tokensOutput: number): number {
  const inputCost = (tokensInput / 1000) * COST_PER_1K_TOKENS_INPUT;
  const outputCost = (tokensOutput / 1000) * COST_PER_1K_TOKENS_OUTPUT;
  return inputCost + outputCost;
}

/**
 * Calcula custo de embeddings (text-embedding-3-small)
 */
function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1000) * COST_PER_1K_TOKENS_EMBEDDING;
}

describe('Cost Calculator', () => {
  describe('calculateChatCost', () => {
    it('deve calcular custo correto para tokens input', () => {
      const cost = calculateChatCost(1000, 0);
      expect(cost).toBe(0.00015);
    });

    it('deve calcular custo correto para tokens output', () => {
      const cost = calculateChatCost(0, 1000);
      expect(cost).toBe(0.0006);
    });

    it('deve calcular custo total correto', () => {
      const cost = calculateChatCost(2156, 45);
      expect(cost).toBeCloseTo(0.00035, 5);
    });

    it('deve retornar 0 para zero tokens', () => {
      const cost = calculateChatCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('calculateEmbeddingCost', () => {
    it('deve calcular custo correto para 1000 tokens', () => {
      const cost = calculateEmbeddingCost(1000);
      expect(cost).toBe(0.00002);
    });

    it('deve calcular custo correto para query pequena', () => {
      const cost = calculateEmbeddingCost(50);
      expect(cost).toBeCloseTo(0.000001, 7);
    });

    it('deve retornar 0 para zero tokens', () => {
      const cost = calculateEmbeddingCost(0);
      expect(cost).toBe(0);
    });
  });

  describe('Estimativas Reais', () => {
    it('deve calcular custo típico de uma interação completa', () => {
      // Embedding da query: ~50 tokens
      const embeddingCost = calculateEmbeddingCost(50);
      
      // Chat: 2156 tokens input (prompt + contexto) + 45 tokens output
      const chatCost = calculateChatCost(2156, 45);
      
      const totalCost = embeddingCost + chatCost;
      
      expect(totalCost).toBeLessThan(0.001); // Menos de $0.001 por interação
      expect(totalCost).toBeCloseTo(0.00035, 5);
    });

    it('deve estimar custo de 1000 interações', () => {
      const costPerInteraction = calculateEmbeddingCost(50) + calculateChatCost(2156, 45);
      const costFor1000 = costPerInteraction * 1000;
      
      expect(costFor1000).toBeLessThan(1); // Menos de $1 para 1000 interações
      expect(costFor1000).toBeCloseTo(0.35, 2);
    });
  });
});
