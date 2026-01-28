/**
 * Tipos Globais da Aplicação
 * 
 * Define tipos TypeScript reutilizáveis em toda a aplicação.
 */

/**
 * Estrutura padrão de resposta da API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Estrutura de resposta paginada
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Estrutura de erro da API
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

/**
 * Tipos de ambientes
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Status HTTP comuns
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Estrutura de metadados de auditoria
 * Para rastrear criação e modificação de registros
 */
export interface AuditMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Query params comuns para listagem
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
