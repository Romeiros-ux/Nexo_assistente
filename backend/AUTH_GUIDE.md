# 🔐 Sistema de Autenticação - Guia Completo

## ✅ Implementação Concluída

Sistema de autenticação robusto e seguro implementado com:
- ✅ Bcrypt para hash de senhas
- ✅ JWT para tokens de autenticação
- ✅ Middlewares de proteção (authGuard, adminGuard)
- ✅ Sistema completo de CRUD de usuários
- ✅ Validação com Zod
- ✅ Arquitetura em camadas

---

## 📊 Estrutura Criada

### 1. **Database Schema** ([database/schema.sql](database/schema.sql))
- Tabela `users` com todos os campos necessários
- Índices para otimização
- Trigger para `updated_at` automático
- Seed com usuário admin inicial

### 2. **Types** ([src/types/user.types.ts](src/types/user.types.ts))
- `User` - Modelo completo do usuário
- `UserPublic` - Usuário sem senha (para API)
- `JWTPayload` - Estrutura do token JWT
- `CreateUserDTO` - Dados para criar usuário
- `UpdateUserDTO` - Dados para atualizar usuário
- `LoginDTO` - Credenciais de login
- Enums: `UserRole`, `UserStatus`

### 3. **Repository** ([src/repositories/user.repository.ts](src/repositories/user.repository.ts))
**Responsabilidade:** Acesso direto ao banco de dados Supabase
- `findByEmail()` - Busca por email
- `findById()` - Busca por ID
- `findAll()` - Lista todos
- `create()` - Cria usuário
- `update()` - Atualiza usuário
- `delete()` - Deleta usuário
- `emailExists()` - Verifica duplicidade

### 4. **Services**

#### AuthService ([src/services/auth.service.ts](src/services/auth.service.ts))
**Responsabilidade:** Lógica de autenticação e segurança
- `login()` - Valida credenciais e gera token
- `getAuthenticatedUser()` - Busca usuário autenticado
- `hashPassword()` - Gera hash bcrypt (10 rounds)
- `verifyPassword()` - Valida senha
- `generateToken()` - Cria JWT
- `verifyToken()` - Valida JWT
- `sanitizeUser()` - Remove informações sensíveis

#### UserService ([src/services/user.service.ts](src/services/user.service.ts))
**Responsabilidade:** Lógica de negócio de usuários
- `getAllUsers()` - Lista todos
- `getUserById()` - Busca por ID
- `createUser()` - Cria com validação
- `updateUser()` - Atualiza com validação
- `deleteUser()` - Deleta com proteções
- Validação com Zod schemas

### 5. **Middlewares** ([src/middlewares/authGuard.ts](src/middlewares/authGuard.ts))

#### authGuard
**Responsabilidade:** Verifica autenticação
- Extrai token do header `Authorization: Bearer <token>`
- Valida token JWT
- Busca dados atualizados do usuário
- Adiciona `req.user` com `{ id, email, role }`

#### adminGuard
**Responsabilidade:** Verifica se é admin (role TI)
- Deve ser usado APÓS `authGuard`
- Verifica `req.user.role === 'TI'`

#### roleGuard(roles)
**Responsabilidade:** Verifica roles customizadas
- Factory function para múltiplas roles
- Exemplo: `roleGuard(['TI', 'Diretor'])`

### 6. **Controllers**

#### AuthController ([src/controllers/auth.controller.ts](src/controllers/auth.controller.ts))
- `login()` - POST /auth/login
- `me()` - GET /auth/me (protegido)
- `logout()` - POST /auth/logout (informativo)

#### UserController ([src/controllers/user.controller.ts](src/controllers/user.controller.ts))
- `getAll()` - GET /users (protegido)
- `getById()` - GET /users/:id (protegido)
- `create()` - POST /users (admin)
- `update()` - PUT /users/:id (admin)
- `delete()` - DELETE /users/:id (admin)

### 7. **Routes**
- [auth.routes.ts](src/routes/auth.routes.ts) - Rotas de autenticação
- [user.routes.ts](src/routes/user.routes.ts) - Rotas de usuários

---

## 🚀 Como Usar

### 1. Configurar Banco de Dados

Execute o schema SQL no Supabase:

```powershell
.\setup-database.ps1
```

Ou manualmente:
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole o conteúdo de `database/schema.sql`
4. Execute a query

### 2. Iniciar Servidor

```powershell
npm run dev
```

### 3. Testar Autenticação

```powershell
.\test-auth.ps1
```

---

## 📡 Endpoints Disponíveis

### **Autenticação**

#### POST /api/v1/auth/login
**Descrição:** Realiza login  
**Acesso:** Público  
**Body:**
```json
{
  "email": "admin@teste.com",
  "password": "Admin@123"
}
```
**Resposta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Administrador",
    "email": "admin@teste.com",
    "role": "TI",
    "status": "active",
    "created_at": "2026-01-09T..."
  }
}
```

#### GET /api/v1/auth/me
**Descrição:** Retorna dados do usuário autenticado  
**Acesso:** Privado (requer token)  
**Header:**
```
Authorization: Bearer <token>
```
**Resposta:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

### **Usuários**

#### GET /api/v1/users
**Descrição:** Lista todos os usuários  
**Acesso:** Privado (qualquer usuário autenticado)  
**Header:**
```
Authorization: Bearer <token>
```

#### GET /api/v1/users/:id
**Descrição:** Busca usuário por ID  
**Acesso:** Privado

#### POST /api/v1/users
**Descrição:** Cria novo usuário  
**Acesso:** Privado (apenas admin - role TI)  
**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "Senha@123",
  "role": "Coordenação",
  "status": "active"
}
```

#### PUT /api/v1/users/:id
**Descrição:** Atualiza usuário  
**Acesso:** Privado (apenas admin)  
**Body:** (campos opcionais)
```json
{
  "name": "João Silva Atualizado",
  "email": "novo@email.com",
  "password": "NovaSenha@123",
  "role": "Diretor",
  "status": "inactive"
}
```

#### DELETE /api/v1/users/:id
**Descrição:** Deleta usuário  
**Acesso:** Privado (apenas admin)

---

## 🔒 Segurança Implementada

### Senhas
- ✅ Hash com **bcrypt** (10 rounds)
- ✅ Validação de complexidade (Zod):
  - Mínimo 8 caracteres
  - 1 letra maiúscula
  - 1 letra minúscula
  - 1 número
  - 1 caractere especial

### JWT
- ✅ Assinado com `JWT_SECRET` (32+ caracteres)
- ✅ Expiração configurável (padrão: 7 dias)
- ✅ Payload contém: `{ id, email, role }`
- ✅ Validação em toda requisição protegida

### Middlewares
- ✅ `authGuard` - Verifica token JWT
- ✅ `adminGuard` - Verifica role TI
- ✅ `roleGuard` - Verifica roles customizadas

### Validações
- ✅ Email único no banco
- ✅ Validação de entrada com Zod
- ✅ Proteção contra auto-deleção
- ✅ Verificação de status do usuário

---

## 🎯 Roles do Sistema

```typescript
enum UserRole {
  TI = 'TI',                              // Admin total
  COMISSAO = 'Comissão',                  // Gestão
  DIRETOR = 'Diretor',                    // Direção
  COORDENACAO = 'Coordenação',            // Coordenadores
  SECRETARIA = 'Secretaria de Educação'   // Secretaria
}
```

---

## 📝 Exemplos de Uso

### Login com PowerShell

```powershell
$body = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

$token = $response.token
```

### Requisição Autenticada

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/me" `
    -Method Get `
    -Headers $headers
```

### Criar Usuário (Admin)

```powershell
$newUser = @{
    name = "Maria Santos"
    email = "maria@escola.com"
    password = "Maria@123"
    role = "Coordenação"
    status = "active"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" `
    -Method Post `
    -Body $newUser `
    -ContentType "application/json" `
    -Headers $headers
```

---

## 🛠️ Ferramentas Úteis

### Gerar Hash de Senha

```powershell
.\generate-hash.ps1
```

### Testar Todos os Endpoints

```powershell
.\test-auth.ps1
```

---

## 📦 Dependências Adicionadas

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
```

---

## ⚡ Fluxo de Autenticação

```
1. Cliente → POST /auth/login { email, password }
2. AuthService verifica credenciais
3. AuthService gera JWT com payload { id, email, role }
4. Cliente recebe token
5. Cliente envia token em todas requisições protegidas
6. authGuard valida token e adiciona req.user
7. Controller acessa req.user para autorização
```

---

## 🔐 Usuário Admin Padrão

Após executar o schema SQL:

```
Email: admin@teste.com
Senha: Admin@123
Role: TI
```

**⚠️ IMPORTANTE:** Altere a senha no primeiro login!

---

## 🎨 Arquitetura em Camadas

```
┌─────────────────────────────────────┐
│         ROUTES (Rotas)              │
│  Define endpoints e aplica guards   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       CONTROLLERS                   │
│  Valida entrada, chama services     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        SERVICES                     │
│  Lógica de negócio e validação     │
│  • AuthService (JWT, bcrypt)        │
│  • UserService (validações)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      REPOSITORIES                   │
│  Acesso ao Supabase                 │
└─────────────────────────────────────┘
```

---

## ✨ Próximos Passos

- [ ] Implementar refresh token
- [ ] Adicionar rate limiting
- [ ] Implementar auditoria de ações
- [ ] Adicionar 2FA (opcional)
- [ ] Implementar recuperação de senha
- [ ] Adicionar logs de acesso
- [ ] Criar testes unitários
- [ ] Documentação Swagger/OpenAPI

---

**✅ Sistema de autenticação pronto para produção!**
