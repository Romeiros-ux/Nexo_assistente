/**
 * Tipos TypeScript da API
 * 
 * Definições de tipos para todas as respostas da API backend.
 * Mantém sincronizado com os contratos do backend.
 */

// ==========================================
// USER TYPES
// ==========================================

/**
 * Perfis institucionais (sincronizado com schema do banco)
 * IMPORTANTE: Deve corresponder exatamente ao ENUM user_role no Supabase
 */
export type UserRole = 'TI' | 'SECRETARIA' | 'DIRETOR' | 'COORDENACAO' | 'COMISSAO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED'; // Sincronizado com status_type ENUM
  phone: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface UserWithUnits extends User {
  units?: EducationalUnit[];
}

// ==========================================
// AUTH TYPES
// ==========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken?: string;
    user: User;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  cpf?: string;
  phone?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
}

// ==========================================
// EDUCATIONAL UNIT TYPES
// ==========================================

/**
 * Tipos de unidades educacionais (sincronizado com schema do banco)
 * IMPORTANTE: Deve corresponder exatamente ao ENUM unit_type no Supabase
 */
export type UnitType = 'SCHOOL' | 'CENTER' | 'DEPARTMENT' | 'SECRETARIAT';

export interface EducationalUnit {
  id: string;
  name: string;
  code: string | null;
  type: UnitType;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface UserUnitLink {
  id: string;
  user_id: string;
  unit_id: string;
  linked_at: string;
  linked_by: string;
  user?: User;
  unit?: EducationalUnit;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
  statusCode?: number;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==========================================
// PAGINATION TYPES
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// FILTER TYPES
// ==========================================

export interface UserFilters {
  role?: UserRole;
  is_active?: boolean;
  search?: string; // Busca por nome ou email
}

export interface UnitFilters {
  type?: UnitType;
  is_active?: boolean;
  search?: string; // Busca por nome ou código
}

// ==========================================
// HEALTH CHECK TYPES
// ==========================================

export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface DetailedHealthResponse extends HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    status: 'connected' | 'disconnected';
    provider: string;
    responseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

// ==========================================
// CHAT/IA TYPES (Para implementação futura)
// ==========================================

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface SendMessageRequest {
  conversation_id?: string; // Se não existir, cria nova conversa
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  conversation_id: string;
  message: ChatMessage;
  assistant_response: ChatMessage;
}

// ==========================================
// TYPE GUARDS
// ==========================================

/**
 * Verifica se a resposta é de sucesso
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Verifica se a resposta é de erro
 */
export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Verifica se é uma resposta paginada
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response.success === true &&
    response.data &&
    Array.isArray(response.data) &&
    response.pagination &&
    typeof response.pagination.page === 'number'
  );
}
