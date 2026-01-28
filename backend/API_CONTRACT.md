# 📋 Contrato de API - Frontend ↔ Backend

## 🎯 Visão Geral

Documento que define o contrato de integração entre o frontend React e o backend Node.js/TypeScript.

---

## 🔐 Autenticação JWT

### Estrutura do Token

```typescript
// Payload JWT
{
  id: string,              // UUID do usuário
  email: string,           // Email do usuário
  role: string,            // 'TI' | 'Comissão' | 'Diretor' | 'Coordenação' | 'Secretaria de Educação'
  iat: number,             // Timestamp de criação (issued at)
  exp: number              // Timestamp de expiração (7 dias)
}
```

### Header de Autorização

```
Authorization: Bearer <token>
```

**Exemplo:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Formato Padrão de Resposta

### ✅ Resposta de Sucesso

```typescript
{
  success: true,
  message?: string,        // Mensagem opcional
  data: T | T[],           // Dados (objeto único ou array)
  total?: number,          // Total de itens (em listagens)
  pagination?: {           // Informações de paginação (futuro)
    page: number,
    limit: number,
    totalPages: number
  }
}
```

### ❌ Resposta de Erro

```typescript
{
  success: false,
  error: string,           // Mensagem de erro legível
  code?: string,           // Código de erro específico (opcional)
  details?: any            // Detalhes adicionais (validação, etc)
}
```

---

## 🚦 Status Codes HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| **200** | OK | Requisição bem-sucedida |
| **201** | Created | Recurso criado com sucesso |
| **400** | Bad Request | Dados inválidos ou validação falhou |
| **401** | Unauthorized | Token inválido, expirado ou ausente |
| **403** | Forbidden | Usuário não tem permissão (role insuficiente) |
| **404** | Not Found | Recurso não encontrado |
| **409** | Conflict | Conflito (ex: email já cadastrado) |
| **500** | Internal Server Error | Erro no servidor |

---

## 🔑 Endpoint: POST /auth/login

### Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@teste.com",
  "password": "Admin@123"
}
```

### Response 200 - Sucesso

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsImVtYWlsIjoiYWRtaW5AdGVzdGUuY29tIiwicm9sZSI6IlRJIiwiaWF0IjoxNzM2NDMyNDAwLCJleHAiOjE3MzcwMzcyMDB9.xyz...",
    "expiresIn": "7d",
    "user": {
      "id": "12345678-90ab-cdef-1234-567890abcdef",
      "name": "Administrador",
      "email": "admin@teste.com",
      "role": "TI",
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z"
    }
  }
}
```

### Response 401 - Credenciais Inválidas

```json
{
  "success": false,
  "error": "Email ou senha inválidos"
}
```

### Response 403 - Usuário Inativo

```json
{
  "success": false,
  "error": "Usuário inativo. Contate o administrador"
}
```

### Validações

| Campo | Regra |
|-------|-------|
| `email` | Obrigatório, formato de email válido |
| `password` | Obrigatório, mínimo 1 caractere |

---

## 👤 Endpoint: GET /auth/me

### Request

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Response 200 - Sucesso

```json
{
  "success": true,
  "data": {
    "id": "12345678-90ab-cdef-1234-567890abcdef",
    "name": "Administrador",
    "email": "admin@teste.com",
    "role": "TI",
    "status": "active",
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z"
  }
}
```

### Response 401 - Token Inválido ou Expirado

```json
{
  "success": false,
  "error": "Token inválido ou expirado"
}
```

### Response 401 - Token Ausente

```json
{
  "success": false,
  "error": "Token não fornecido"
}
```

---

## 👥 Endpoint: GET /users

### Request

```http
GET /api/v1/users
Authorization: Bearer <token>
```

### Response 200 - Sucesso (Admin TI)

```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-90ab-cdef-1234-567890abcdef",
      "name": "Administrador",
      "email": "admin@teste.com",
      "role": "TI",
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z",
      "updated_at": "2026-01-09T10:00:00.000Z"
    },
    {
      "id": "abcdef12-3456-7890-abcd-ef1234567890",
      "name": "João Silva",
      "email": "joao@escola.com",
      "role": "Diretor",
      "status": "active",
      "created_at": "2026-01-09T11:00:00.000Z",
      "updated_at": "2026-01-09T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

### Response 403 - Usuário Não é Admin

```json
{
  "success": false,
  "error": "Acesso negado. Apenas administradores (TI) podem acessar este recurso"
}
```

### Response 401 - Não Autenticado

```json
{
  "success": false,
  "error": "Token não fornecido"
}
```

---

## 🏫 Endpoint: GET /educational-units

### Request

```http
GET /api/v1/educational-units
Authorization: Bearer <token>
```

### Response 200 - Sucesso (TI)

```json
{
  "success": true,
  "data": [
    {
      "id": "unit-uuid-1",
      "name": "Escola Municipal João Silva",
      "type": "school",
      "code": "EM001",
      "address": "Rua das Flores, 123",
      "phone": "(11) 1234-5678",
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z",
      "updated_at": "2026-01-09T10:00:00.000Z"
    },
    {
      "id": "unit-uuid-2",
      "name": "Centro de Educação Infantil Maria Santos",
      "type": "center",
      "code": "CEI001",
      "address": "Av. Principal, 456",
      "phone": null,
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z",
      "updated_at": "2026-01-09T10:00:00.000Z"
    }
  ],
  "total": 2,
  "user_role": "TI",
  "access_note": "Administrador - visualizando todas as unidades"
}
```

### Response 200 - Sucesso (Diretor com vínculos)

```json
{
  "success": true,
  "data": [
    {
      "id": "unit-uuid-1",
      "name": "Escola Municipal João Silva",
      "type": "school",
      "code": "EM001",
      "address": "Rua das Flores, 123",
      "phone": "(11) 1234-5678",
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z",
      "updated_at": "2026-01-09T10:00:00.000Z"
    }
  ],
  "total": 1,
  "user_role": "Diretor",
  "access_note": "Visualizando apenas unidades vinculadas ao seu usuário"
}
```

---

## 🔗 Endpoint: GET /users/:id/units

### Request

```http
GET /api/v1/users/12345678-90ab-cdef-1234-567890abcdef/units
Authorization: Bearer <token>
```

### Response 200 - Sucesso

```json
{
  "success": true,
  "data": [
    {
      "id": "unit-uuid-1",
      "name": "Escola Municipal João Silva",
      "type": "school",
      "code": "EM001",
      "address": "Rua das Flores, 123",
      "phone": "(11) 1234-5678",
      "status": "active",
      "created_at": "2026-01-09T10:00:00.000Z",
      "updated_at": "2026-01-09T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Response 403 - Acesso Negado

```json
{
  "success": false,
  "error": "Acesso negado"
}
```

---

## 🎭 Tipos TypeScript para o Frontend

### User Type

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

type UserRole = 
  | 'TI' 
  | 'Comissão' 
  | 'Diretor' 
  | 'Coordenação' 
  | 'Secretaria de Educação';

type UserStatus = 'active' | 'inactive' | 'suspended';
```

### Auth Response Type

```typescript
interface LoginResponse {
  success: true;
  message: string;
  data: {
    token: string;
    expiresIn: string;
    user: User;
  };
}

interface AuthMeResponse {
  success: true;
  data: User;
}
```

### Educational Unit Type

```typescript
interface EducationalUnit {
  id: string;
  name: string;
  type: UnitType;
  code?: string;
  address?: string;
  phone?: string;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

type UnitType = 'school' | 'center' | 'department';
type UnitStatus = 'active' | 'inactive';

interface UnitsResponse {
  success: true;
  data: EducationalUnit[];
  total: number;
  user_role: UserRole;
  access_note: string;
}
```

### Error Response Type

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

### API Response Type (Generic)

```typescript
type ApiResponse<T> = 
  | {
      success: true;
      data: T;
      message?: string;
      total?: number;
    }
  | {
      success: false;
      error: string;
      code?: string;
      details?: any;
    };
```

---

## 🛡️ Proteção de Rotas no Frontend

### Identificação de Admin

```typescript
// Verificar se usuário é admin
const isAdmin = user?.role === 'TI';

// Ou usar no AuthContext
const { user, isAdmin } = useAuth();
```

### Roles e Permissões

| Role | Descrição | Pode Acessar |
|------|-----------|--------------|
| **TI** | Administrador | Todas as rotas, inclusive admin |
| **Comissão** | Membro da comissão | Rotas gerais, sem admin |
| **Diretor** | Diretor de escola | Rotas gerais, sem admin |
| **Coordenação** | Coordenador pedagógico | Rotas gerais, sem admin |
| **Secretaria de Educação** | Secretaria municipal | Rotas gerais, sem admin |

### Exemplo de Lógica Frontend

```typescript
// 1. Fazer login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success) {
  // 2. Salvar token
  localStorage.setItem('token', data.data.token);
  
  // 3. Salvar usuário
  setUser(data.data.user);
  
  // 4. Verificar role e redirecionar
  if (data.data.user.role === 'TI') {
    navigate('/admin');
  } else {
    navigate('/chat');
  }
}

// 5. Adicionar token em todas as requisições
const token = localStorage.getItem('token');
fetch('/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 6. Verificar autenticação em rotas protegidas
const { data: currentUser } = await fetch('/api/v1/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!currentUser.success) {
  // Token inválido - redirecionar para login
  navigate('/login');
}
```

---

## 🚨 Erros Padronizados

### Erro de Validação (400)

```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    },
    {
      "field": "password",
      "message": "Senha deve ter no mínimo 8 caracteres"
    }
  ]
}
```

### Erro de Autenticação (401)

```json
{
  "success": false,
  "error": "Token não fornecido"
}
```

```json
{
  "success": false,
  "error": "Token inválido ou expirado"
}
```

### Erro de Autorização (403)

```json
{
  "success": false,
  "error": "Acesso negado. Apenas administradores (TI) podem acessar este recurso"
}
```

### Erro de Recurso Não Encontrado (404)

```json
{
  "success": false,
  "error": "Usuário não encontrado"
}
```

### Erro de Conflito (409)

```json
{
  "success": false,
  "error": "Email já cadastrado"
}
```

### Erro do Servidor (500)

```json
{
  "success": false,
  "error": "Erro interno do servidor. Tente novamente mais tarde"
}
```

---

## 🔄 Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    F->>B: POST /auth/login {email, password}
    B->>DB: Busca usuário por email
    DB-->>B: Retorna usuário com password hash
    B->>B: Compara senha com bcrypt
    B->>B: Gera JWT token (7 dias)
    B-->>F: {success, token, user}
    F->>F: Salva token no localStorage
    F->>F: Verifica user.role
    alt role === 'TI'
        F->>F: Redireciona para /admin
    else
        F->>F: Redireciona para /chat
    end
    
    Note over F,B: Requisições subsequentes
    
    F->>B: GET /users (Authorization: Bearer token)
    B->>B: Valida JWT token
    B->>B: Extrai user.id e user.role
    B->>B: Verifica se role === 'TI'
    alt É admin
        B->>DB: SELECT * FROM users
        DB-->>B: Lista de usuários
        B-->>F: {success, data: users[]}
    else Não é admin
        B-->>F: {success: false, error: "Acesso negado"}
    end
```

---

## 📝 Checklist de Integração Frontend

### Autenticação
- [ ] Implementar `POST /auth/login` com salvamento de token
- [ ] Implementar `GET /auth/me` para validar sessão
- [ ] Salvar token no `localStorage` ou `sessionStorage`
- [ ] Adicionar `Authorization: Bearer <token>` em todas as requisições protegidas
- [ ] Interceptor para renovação ou limpeza de token expirado

### Verificação de Role
- [ ] Verificar `user.role === 'TI'` para identificar admin
- [ ] Redirecionar admin para `/admin` após login
- [ ] Redirecionar outros perfis para `/chat` após login
- [ ] Proteger rotas admin no React Router (PrivateRoute + AdminRoute)

### Tratamento de Erros
- [ ] Capturar status `401` → Redirecionar para login
- [ ] Capturar status `403` → Mostrar "Acesso negado"
- [ ] Capturar status `400` → Exibir erros de validação
- [ ] Capturar status `500` → Mostrar mensagem genérica

### Governança de Dados
- [ ] Buscar unidades do usuário via `GET /users/:id/units`
- [ ] Armazenar `unitIds` no contexto para filtros futuros
- [ ] Usar `GET /educational-units/filter/for-user` para assistente IA

---

## 🎯 Exemplo Completo de Integração

### AuthContext (Frontend)

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// Exemplo de uso
const { user, isAdmin, login } = useAuth();

// Login
await login('admin@teste.com', 'Admin@123');

// Verificar se é admin
if (isAdmin) {
  // Mostrar menu admin
}

// Verificar role
if (user?.role === 'TI') {
  // Liberar funcionalidades admin
}
```

### API Client (Frontend)

```typescript
// api.ts
const API_BASE_URL = 'http://localhost:3001/api/v1';

async function apiRequest<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  const data = await response.json();

  // Tratar erros de autenticação
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return data;
}

// Uso
const users = await apiRequest<User[]>('/users');
const units = await apiRequest<EducationalUnit[]>('/educational-units');
```

---

## ✅ Status da Implementação Backend

| Endpoint | Método | Status | Role Required |
|----------|--------|--------|---------------|
| `/auth/login` | POST | ✅ Implementado | Público |
| `/auth/me` | GET | ✅ Implementado | Autenticado |
| `/auth/logout` | POST | ✅ Implementado | Autenticado |
| `/users` | GET | ✅ Implementado | TI (Admin) |
| `/users/:id` | GET | ✅ Implementado | TI (Admin) |
| `/users` | POST | ✅ Implementado | TI (Admin) |
| `/users/:id` | PUT | ✅ Implementado | TI (Admin) |
| `/users/:id` | DELETE | ✅ Implementado | TI (Admin) |
| `/educational-units` | GET | ✅ Implementado | Autenticado (filtrado) |
| `/educational-units/:id` | GET | ✅ Implementado | Autenticado (com verificação) |
| `/educational-units` | POST | ✅ Implementado | TI (Admin) |
| `/educational-units/:id` | PUT | ✅ Implementado | TI (Admin) |
| `/educational-units/:id` | DELETE | ✅ Implementado | TI (Admin) |
| `/users/:id/units` | GET | ✅ Implementado | Autenticado (próprias) |
| `/users/:id/units` | POST | ✅ Implementado | TI (Admin) |
| `/educational-units/filter/for-user` | GET | ✅ Implementado | Autenticado |

---

**✅ Contrato de API completo e pronto para integração frontend!**
