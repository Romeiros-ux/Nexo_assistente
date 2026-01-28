# 📘 Guia de Integração Frontend ↔ Backend

## 🎯 Visão Geral

Este documento é o **ponto de partida** para integrar o frontend React com o backend Node.js/TypeScript já implementado.

---

## 📚 Documentação Disponível

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **[API_CONTRACT.md](API_CONTRACT.md)** | Contrato completo da API com todos os endpoints, formatos de resposta e status codes | Referência geral de endpoints |
| **[FRONTEND_INTEGRATION_EXAMPLES.md](FRONTEND_INTEGRATION_EXAMPLES.md)** | Exemplos completos de código TypeScript/React prontos para copiar | Implementação no frontend |
| **[EDUCATIONAL_UNITS.md](EDUCATIONAL_UNITS.md)** | Documentação do sistema de unidades educacionais e governança | Entender modelo de governança |
| **[AUTH_GUIDE.md](AUTH_GUIDE.md)** | Guia completo de autenticação com JWT e bcrypt | Entender autenticação |
| **[GOVERNANCE_SUMMARY.md](GOVERNANCE_SUMMARY.md)** | Resumo executivo do sistema de governança | Visão geral rápida |

---

## 🚀 Quick Start - 3 Passos

### 1️⃣ Entender o Contrato

Leia: **[API_CONTRACT.md](API_CONTRACT.md)**

**Pontos principais:**
- Formato de resposta padrão: `{ success, data/error, message?, total? }`
- Token JWT: `Authorization: Bearer <token>`
- Identificação de admin: `user.role === 'TI'`
- Status codes: 200, 201, 400, 401, 403, 404, 500

### 2️⃣ Copiar Código Base

Abra: **[FRONTEND_INTEGRATION_EXAMPLES.md](FRONTEND_INTEGRATION_EXAMPLES.md)**

**Copie para o frontend:**
1. Types (`types/api.ts`)
2. API Client (`lib/api.ts`)
3. Services (`services/authService.ts`, `usersService.ts`, `unitsService.ts`)
4. AuthContext (`contexts/AuthContext.tsx`)
5. ProtectedRoute (`components/ProtectedRoute.tsx`)

### 3️⃣ Testar Integração

Execute o teste de contrato:

```powershell
cd backend
npm run dev

# Em outro terminal
.\test-api-contract.ps1
```

**Resultado esperado:**
- ✅ Todos os contratos validados
- ✅ Login retorna token + user
- ✅ /auth/me retorna usuário autenticado
- ✅ Estruturas de resposta corretas

---

## 🔐 Autenticação - Fluxo Completo

### Backend (Já Implementado)

```
POST /auth/login
→ Valida credenciais
→ Gera JWT (7 dias)
→ Retorna: { success, message, data: { token, expiresIn, user } }

GET /auth/me
→ Valida JWT do header
→ Retorna: { success, data: user }
```

### Frontend (Para Implementar)

```typescript
// 1. Fazer login
const response = await authService.login(email, password);

if (response.success) {
  // 2. Token já foi salvo automaticamente no localStorage
  
  // 3. Verificar role e redirecionar
  if (response.data.user.role === 'TI') {
    navigate('/admin');  // Admin → Painel administrativo
  } else {
    navigate('/chat');   // Outros → Chat
  }
}

// 4. Em rotas protegidas: verificar autenticação
const { user, isAdmin, isAuthenticated } = useAuth();

// 5. Proteger rotas no Router
<Route path="/admin" element={
  <ProtectedRoute adminOnly>
    <AdminPage />
  </ProtectedRoute>
} />
```

---

## 🎭 Identificação de Admin

### Como Identificar se Usuário é Admin (TI)

```typescript
// Método 1: Via AuthContext
const { user, isAdmin } = useAuth();

if (isAdmin) {
  // Mostrar menu admin, liberar CRUD, etc
}

// Método 2: Verificação direta
if (user?.role === 'TI') {
  // Usuário é admin
}
```

### Redirecionamento Após Login

```typescript
// No Login.tsx
const success = await login(email, password);

if (success) {
  const { user } = useAuth();
  
  // TI → Admin Dashboard
  if (user.role === 'TI') {
    navigate('/admin');
  }
  // Outros perfis → Chat
  else {
    navigate('/chat');
  }
}
```

---

## 📊 Formato das Respostas

### ✅ Sucesso (200, 201)

```json
{
  "success": true,
  "data": { ... },
  "message": "...",  // opcional
  "total": 5         // opcional (em listagens)
}
```

### ❌ Erro (400, 401, 403, 404, 500)

```json
{
  "success": false,
  "error": "Mensagem de erro legível"
}
```

### 🔍 Como Verificar no Frontend

```typescript
const response = await api.get<User[]>('/users');

if (response.success) {
  // Sucesso: usar response.data
  setUsers(response.data);
} else {
  // Erro: mostrar response.error
  setError(response.error);
}
```

---

## 🏫 Governança de Unidades

### Regras de Acesso

| Perfil | Acesso a Unidades | Permissões |
|--------|-------------------|------------|
| **TI** | 🌍 Todas (sem filtro) | CRUD completo |
| **Outros** | 📍 Apenas vinculadas | Apenas leitura |

### Endpoints

```typescript
// Listar unidades (filtrado automaticamente)
GET /educational-units
// TI vê todas, outros veem apenas suas unidades

// Unidades de um usuário específico
GET /users/:id/units

// Vincular usuário a unidades (apenas TI)
POST /users/:id/units
Body: { unit_ids: ["uuid1", "uuid2"] }

// Filtro para assistente IA
GET /educational-units/filter/for-user
// Retorna: { hasAccess, unitIds, isAdmin, filterRequired }
```

---

## 📋 Checklist de Implementação

### Configuração
- [ ] Criar arquivo `.env` no frontend com `VITE_API_URL=http://localhost:3001/api/v1`
- [ ] Instalar dependências necessárias
- [ ] Configurar CORS no backend (já configurado)

### Types e Utilities
- [ ] Copiar types de `FRONTEND_INTEGRATION_EXAMPLES.md` → `src/types/api.ts`
- [ ] Criar `src/lib/api.ts` com ApiClient
- [ ] Criar services: `authService`, `usersService`, `unitsService`

### Autenticação
- [ ] Implementar `AuthContext` e `AuthProvider`
- [ ] Criar hook `useAuth()`
- [ ] Implementar página de Login com redirecionamento baseado em role
- [ ] Criar componente `ProtectedRoute`

### Rotas
- [ ] Configurar rotas públicas (`/login`)
- [ ] Configurar rotas protegidas (`/chat`)
- [ ] Configurar rotas admin (`/admin`, `/admin/users`, `/admin/units`)
- [ ] Adicionar `ProtectedRoute` com `adminOnly` nas rotas admin

### Páginas Admin (apenas TI)
- [ ] Dashboard admin
- [ ] Listagem e CRUD de usuários
- [ ] Listagem e CRUD de unidades educacionais
- [ ] Gerenciamento de vínculos usuário x unidade

### Tratamento de Erros
- [ ] Interceptor 401 → remover token e redirecionar para login
- [ ] Interceptor 403 → mostrar "Acesso negado"
- [ ] Mostrar erros de validação (400)
- [ ] Tratar erros de rede

---

## 🧪 Como Testar

### 1. Backend
```powershell
cd backend
npm run dev
```

### 2. Teste de Contrato
```powershell
.\test-api-contract.ps1
```

### 3. Teste Manual
```powershell
# Login
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@teste.com","password":"Admin@123"}'

# Token
$token = $response.data.token

# Listar usuários
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method Get -Headers @{Authorization="Bearer $token"}
```

### 4. Frontend
```bash
# Configurar variável de ambiente
echo "VITE_API_URL=http://localhost:3001/api/v1" > .env

# Iniciar frontend
npm run dev

# Testar login:
# Email: admin@teste.com
# Senha: Admin@123
# Deve redirecionar para /admin (porque role é TI)
```

---

## 🔧 Troubleshooting

### Erro 401 "Token não fornecido"
- Verificar se o token está sendo salvo no localStorage
- Verificar se o header `Authorization: Bearer <token>` está sendo enviado
- Verificar se o token não expirou (válido por 7 dias)

### Erro 403 "Acesso negado"
- Verificar se a rota exige `role === 'TI'`
- Verificar se o usuário logado tem o perfil correto
- Verificar se `adminGuard` está sendo usado corretamente

### CORS Error
- Backend já está configurado com CORS
- Verificar se `VITE_API_URL` está correta
- Verificar se o backend está rodando

### Redirecionamento Incorreto
- Verificar a lógica: `user.role === 'TI'` → `/admin`, outros → `/chat`
- Verificar se `isAdmin` está sendo calculado corretamente no AuthContext
- Verificar se o login está atualizando o state do usuário

---

## 📞 Endpoints Principais

### Autenticação
- `POST /auth/login` - Login (público)
- `GET /auth/me` - Usuário autenticado
- `POST /auth/logout` - Logout

### Usuários (Admin only)
- `GET /users` - Listar todos
- `GET /users/:id` - Buscar por ID
- `POST /users` - Criar novo
- `PUT /users/:id` - Atualizar
- `DELETE /users/:id` - Deletar

### Unidades Educacionais
- `GET /educational-units` - Listar (filtrado por role)
- `GET /educational-units/:id` - Buscar por ID
- `POST /educational-units` - Criar (admin only)
- `PUT /educational-units/:id` - Atualizar (admin only)
- `DELETE /educational-units/:id` - Deletar (admin only)

### Vínculos
- `GET /users/:id/units` - Unidades do usuário
- `POST /users/:id/units` - Vincular unidades (admin only)

---

## 🎯 Próximos Passos

1. **Implementar Base do Frontend**
   - Copiar types, api client e services de `FRONTEND_INTEGRATION_EXAMPLES.md`
   - Implementar AuthContext
   - Criar ProtectedRoute

2. **Implementar Login**
   - Página de login
   - Lógica de redirecionamento baseada em role
   - Salvamento de token

3. **Implementar Rotas Protegidas**
   - Rota `/chat` para usuários gerais
   - Rotas `/admin/*` para TI

4. **Implementar Páginas Admin**
   - Dashboard
   - CRUD de usuários
   - CRUD de unidades
   - Gerenciamento de vínculos

5. **Integrar Assistente IA**
   - Usar `GET /educational-units/filter/for-user` para obter filtros
   - Aplicar filtros nas queries do assistente
   - Respeitar governança de dados

---

## 📚 Documentação Completa

Para mais detalhes sobre cada aspecto:

- **[API_CONTRACT.md](API_CONTRACT.md)** - Contrato completo da API
- **[FRONTEND_INTEGRATION_EXAMPLES.md](FRONTEND_INTEGRATION_EXAMPLES.md)** - Código pronto para copiar
- **[EDUCATIONAL_UNITS.md](EDUCATIONAL_UNITS.md)** - Sistema de unidades
- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - Sistema de autenticação
- **[GOVERNANCE_SUMMARY.md](GOVERNANCE_SUMMARY.md)** - Resumo da governança

---

**✅ Backend 100% pronto e documentado. Frontend pode iniciar integração seguindo este guia!**
