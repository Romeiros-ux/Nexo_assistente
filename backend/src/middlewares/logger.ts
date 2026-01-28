/**
 * Middleware de Logging
 * 
 * Registra todas as requisições HTTP recebidas pela API.
 * Utiliza o Morgan para logging estruturado.
 */

import morgan from 'morgan';
import { env } from '../config/env';

/**
 * Formato customizado de log para desenvolvimento
 * Inclui método, URL, status e tempo de resposta
 */
const devFormat = ':method :url :status :res[content-length] - :response-time ms';

/**
 * Formato de log para produção
 * Formato Apache combined - mais detalhado para análise
 */
const prodFormat = 'combined';

/**
 * Middleware de logging configurado baseado no ambiente
 */
export const logger = morgan(
  env.NODE_ENV === 'production' ? prodFormat : devFormat
);

/**
 * Stream customizado para integração com sistema de logs
 * Pode ser expandido para enviar logs para serviços externos
 */
export const loggerStream = {
  write: (message: string) => {
    // Remove a quebra de linha adicionada pelo morgan
    console.log(message.trim());
  },
};
