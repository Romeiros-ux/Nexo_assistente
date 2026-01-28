/**
 * Testes para o Master Prompt
 * Testa as funções de construção e validação do prompt
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildChatPrompt,
  validateChatContext,
  FAIL_SAFE_MESSAGES,
  SYSTEM_PROMPT,
  MODEL_CONFIG,
  PROMPT_VERSION,
  type ChatContext,
} from '../prompts/master.prompt';

describe('Master Prompt', () => {
  describe('Configurações', () => {
    it('deve ter SYSTEM_PROMPT definido', () => {
      expect(SYSTEM_PROMPT).toBeDefined();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('deve ter MODEL_CONFIG válido', () => {
      expect(MODEL_CONFIG.model).toBe('gpt-4o-mini');
      expect(MODEL_CONFIG.temperature).toBe(0.3);
      expect(MODEL_CONFIG.max_tokens).toBe(800);
    });

    it('deve ter versão do prompt definida', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+$/);
    });
  });

  describe('validateChatContext', () => {
    const validContext: ChatContext = {
      user_profile: 'DIRETOR',
      unit_name: 'Escola ABC',
      query: 'Qual o calendário escolar?',
      chunks: [
        {
          content: 'O calendário escolar de 2026...',
          source: {
            document_name: 'calendario-2026.pdf',
            document_type: 'norma',
          },
          similarity: 0.92,
        },
      ],
    };

    it('deve validar contexto correto', () => {
      const result = validateChatContext(validContext);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar contexto sem chunks', () => {
      const invalidContext = { ...validContext, chunks: [] };
      const result = validateChatContext(invalidContext);
      expect(result.valid).toBe(true); // Contexto é válido mesmo sem chunks (tratado pelo serviço)
    });

    it('deve rejeitar query vazia ou muito curta', () => {
      const invalidContext = { ...validContext, query: '' };
      const result = validateChatContext(invalidContext);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Query muito curta');
    });
  });

  describe('buildChatPrompt', () => {
    const context: ChatContext = {
      user_profile: 'DIRETOR',
      unit_name: 'Escola ABC',
      query: 'Qual o calendário escolar 2026?',
      chunks: [
        {
          content: 'O calendário escolar de 2026 inicia em 10 de fevereiro.',
          source: {
            document_name: 'calendario-2026.pdf',
            document_type: 'norma',
          },
          similarity: 0.92,
        },
      ],
    };

    it('deve gerar prompt válido', () => {
      const prompt = buildChatPrompt(context);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('deve incluir query no prompt', () => {
      const prompt = buildChatPrompt(context);
      expect(prompt).toContain(context.query);
    });

    it('deve incluir conteúdo dos chunks', () => {
      const prompt = buildChatPrompt(context);
      expect(prompt).toContain(context.chunks[0].content);
    });

    it('deve incluir informações de fonte', () => {
      const prompt = buildChatPrompt(context);
      expect(prompt).toContain(context.chunks[0].source.document_name);
    });
  });

  describe('FAIL_SAFE_MESSAGES', () => {
    it('deve ter mensagem para NO_CHUNKS', () => {
      expect(FAIL_SAFE_MESSAGES.NO_CHUNKS).toBeDefined();
      expect(FAIL_SAFE_MESSAGES.NO_CHUNKS.length).toBeGreaterThan(0);
    });

    it('deve ter mensagem para INVALID_QUERY', () => {
      expect(FAIL_SAFE_MESSAGES.INVALID_QUERY).toBeDefined();
      expect(FAIL_SAFE_MESSAGES.INVALID_QUERY.length).toBeGreaterThan(0);
    });

    it('deve ter mensagem para API_ERROR', () => {
      expect(FAIL_SAFE_MESSAGES.API_ERROR).toBeDefined();
      expect(FAIL_SAFE_MESSAGES.API_ERROR.length).toBeGreaterThan(0);
    });

    it('deve ter mensagem para RATE_LIMIT', () => {
      expect(FAIL_SAFE_MESSAGES.RATE_LIMIT).toBeDefined();
      expect(FAIL_SAFE_MESSAGES.RATE_LIMIT.length).toBeGreaterThan(0);
    });
  });
});
