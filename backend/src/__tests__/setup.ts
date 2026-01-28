/**
 * Setup global para testes
 * Configurações e mocks compartilhados
 */

// Mock de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '0';

// Aumentar timeout para testes de integração
jest.setTimeout(10000);
