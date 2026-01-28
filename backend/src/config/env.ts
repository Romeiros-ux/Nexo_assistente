/**
 * Configuração de Variáveis de Ambiente
 * 
 * Carrega e valida todas as variáveis de ambiente necessárias para a aplicação.
 * Utiliza o Zod para garantir type-safety e validação em tempo de execução.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega variáveis do arquivo .env
dotenv.config();

/**
 * Schema de validação das variáveis de ambiente
 * Define o tipo e as regras de validação para cada variável
 */
const envSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3001'),
  API_PREFIX: z.string().default('/api/v1'),

  // Supabase
  SUPABASE_URL: z.string().url('URL do Supabase inválida'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Anon key do Supabase é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key do Supabase é obrigatória'),

  // Database
  DATABASE_PASSWORD: z.string().min(1, 'Senha do banco de dados é obrigatória'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform((str) => str.split(',').map(s => s.trim())),

  // JWT (preparado para autenticação futura)
  JWT_SECRET: z.string().min(32, 'JWT secret deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Logs
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * Valida e exporta as variáveis de ambiente
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro nas variáveis de ambiente:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

/**
 * Type-safe environment variables
 * Permite autocompletar e type-checking no TypeScript
 */
export type Env = z.infer<typeof envSchema>;
