# 🏫 Sistema de Unidades Educacionais e Governança de Acesso

## 📋 Visão Geral

Sistema de governança educacional que implementa controle de acesso baseado em unidades educacionais. Cada usuário possui um perfil (role) e pode estar vinculado a uma ou mais unidades, determinando seu escopo de visualização de dados.

---

## 🎯 Regras de Negócio

### Perfis e Acessos

| Perfil | Acesso | Vínculos |
|--------|--------|----------|
| **TI** | Vê todos os dados de todas as unidades | Não necessita vínculo (acesso global) |
| **Comissão** | Apenas unidades vinculadas | Requer vínculo |
| **Diretor** | Apenas unidades vinculadas | Requer vínculo |
| **Coordenação** | Apenas unidades vinculadas | Requer vínculo |
| **Secretaria de Educação** | Apenas unidades vinculadas | Requer vínculo |

### Relacionamentos

- **Usuário ↔ Unidades**: N para N (muitos para muitos)
- Um usuário pode ter **várias unidades**
- Uma unidade pode ter **vários usuários**
- O perfil **TI** pode gerenciar usuários e vínculos
- Outros perfis **apenas consultam** suas unidades

---

## 🗄️ Modelo de Dados

### Educational Units (Unidades Educacionais)

```typescript
{
  id: UUID,
  name: string,              // Ex: "Escola Municipal João Silva"
  type: enum,                // 'school' | 'center' | 'department'
  code?: string,             // Ex: "EM001"
  address?: string,
  phone?: string,
  status: enum,              // 'active' | 'inactive'
  created_at: timestamp,
  updated_at: timestamp
}
```

### User Units (Vínculos)

```typescript
{
  id: UUID,
  user_id: UUID,             // FK -> users(id)
  unit_id: UUID,             // FK -> educational_units(id)
  created_at: timestamp,
  
  // Constraint: UNIQUE(user_id, unit_id)
}
```

---

## 🔌 Endpoints da API

### 📚 Unidades Educacionais

#### **GET** `/educational-units`
Lista unidades baseado no perfil do usuário
- **TI**: Retorna todas as unidades
- **Outros perfis**: Retorna apenas unidades vinculadas ao usuário

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Escola Municipal João Silva",
      "type": "school",
      "code": "EM001",
      "address": "Rua das Flores, 123",
      "phone": "(11) 1234-5678",
      "status": "active",
      "created_at": "2026-01-09T10:00:00Z",
      "updated_at": "2026-01-09T10:00:00Z"
    }
  ],
  "total": 3,
  "user_role": "TI",
  "access_note": "Administrador - visualizando todas as unidades"
}
```

---

#### **GET** `/educational-units/:id`
Busca unidade por ID (verifica se o usuário tem acesso)

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Escola Municipal João Silva",
    "type": "school",
    "code": "EM001",
    "status": "active"
  }
}
```

**Response 403:**
```json
{
  "success": false,
  "error": "Acesso negado a esta unidade"
}
```

---

#### **POST** `/educational-units`
Cria nova unidade educacional
- **Acesso**: Apenas TI

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Escola Municipal Nova",
  "type": "school",
  "code": "EM002",
  "address": "Av. Principal, 456",
  "phone": "(11) 9876-5432",
  "status": "active"
}
```

**Validações:**
- `name`: mínimo 3 caracteres
- `type`: deve ser 'school', 'center' ou 'department'
- `code`: opcional, mas deve ser único
- `status`: opcional, padrão 'active'

**Response 201:**
```json
{
  "success": true,
  "message": "Unidade educacional criada com sucesso",
  "data": {
    "id": "uuid",
    "name": "Escola Municipal Nova",
    "type": "school",
    "code": "EM002",
    "status": "active",
    "created_at": "2026-01-09T10:00:00Z"
  }
}
```

---

#### **PUT** `/educational-units/:id`
Atualiza unidade educacional
- **Acesso**: Apenas TI

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** (campos opcionais)
```json
{
  "name": "Escola Municipal João Silva - Atualizado",
  "status": "inactive"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Unidade educacional atualizada com sucesso",
  "data": {
    "id": "uuid",
    "name": "Escola Municipal João Silva - Atualizado",
    "status": "inactive",
    "updated_at": "2026-01-09T11:00:00Z"
  }
}
```

---

#### **DELETE** `/educational-units/:id`
Deleta unidade educacional
- **Acesso**: Apenas TI
- **Restrição**: Não pode deletar se houver usuários vinculados

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "message": "Unidade educacional deletada com sucesso"
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "Não é possível deletar. Há 5 usuário(s) vinculado(s) a esta unidade"
}
```

---

### 🔗 Vínculos Usuário x Unidade

#### **GET** `/users/:id/units`
Lista unidades de um usuário
- **TI**: Pode ver unidades de qualquer usuário
- **Outros perfis**: Podem ver apenas suas próprias unidades

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "unit-uuid-1",
      "name": "Escola Municipal João Silva",
      "type": "school",
      "code": "EM001"
    },
    {
      "id": "unit-uuid-2",
      "name": "Centro de Educação Infantil",
      "type": "center",
      "code": "CEI001"
    }
  ],
  "total": 2
}
```

---

#### **POST** `/users/:id/units`
Vincula usuário a unidades (substitui vínculos existentes)
- **Acesso**: Apenas TI

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "unit_ids": [
    "unit-uuid-1",
    "unit-uuid-2",
    "unit-uuid-3"
  ]
}
```

**Validações:**
- Todos os IDs devem ser UUIDs válidos
- Todas as unidades devem existir
- Remove vínculos anteriores e cria novos

**Response 200:**
```json
{
  "success": true,
  "message": "Unidades vinculadas ao usuário com sucesso",
  "data": [
    {
      "id": "unit-uuid-1",
      "name": "Escola Municipal João Silva",
      "type": "school"
    },
    {
      "id": "unit-uuid-2",
      "name": "Centro de Educação Infantil",
      "type": "center"
    }
  ],
  "total": 2
}
```

---

#### **GET** `/educational-units/filter/for-user`
Retorna informações de filtro para o usuário atual
- **Uso**: Assistente de IA para filtrar dados contextualizados

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200 (TI):**
```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "unitIds": [],           // Vazio para TI (acesso global)
    "isAdmin": true,
    "filterRequired": false
  },
  "message": "Informações de filtro para uso pelo assistente de IA"
}
```

**Response 200 (Diretor):**
```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "unitIds": ["unit-uuid-1", "unit-uuid-2"],
    "isAdmin": false,
    "filterRequired": true
  },
  "message": "Informações de filtro para uso pelo assistente de IA"
}
```

---

## 🔐 Autenticação e Autorização

### Middlewares Utilizados

| Middleware | Função | Rotas |
|------------|--------|-------|
| `authGuard` | Valida JWT e adiciona `req.user` | Todas as rotas protegidas |
| `adminGuard` | Verifica se role === 'TI' | POST, PUT, DELETE unidades e vínculos |

### Estrutura de `req.user`

```typescript
{
  id: string,        // UUID do usuário
  email: string,
  role: UserRole,    // 'TI' | 'Comissão' | 'Diretor' | etc
  iat: number,       // Token issued at
  exp: number        // Token expiration
}
```

---

## 🧪 Exemplos de Uso

### 1️⃣ Criar Unidade (TI)

```bash
curl -X POST http://localhost:3001/api/v1/educational-units \
  -H "Authorization: Bearer $TOKEN_TI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Escola Estadual Santos Dumont",
    "type": "school",
    "code": "EE001",
    "address": "Rua dos Aviadores, 789"
  }'
```

### 2️⃣ Vincular Usuário a Unidades (TI)

```bash
curl -X POST http://localhost:3001/api/v1/users/user-uuid/units \
  -H "Authorization: Bearer $TOKEN_TI" \
  -H "Content-Type: application/json" \
  -d '{
    "unit_ids": [
      "unit-uuid-1",
      "unit-uuid-2"
    ]
  }'
```

### 3️⃣ Listar Unidades (Diretor)

```bash
curl -X GET http://localhost:3001/api/v1/educational-units \
  -H "Authorization: Bearer $TOKEN_DIRETOR"
  
# Retorna apenas as unidades vinculadas ao diretor
```

### 4️⃣ Obter Filtro para IA

```bash
curl -X GET http://localhost:3001/api/v1/educational-units/filter/for-user \
  -H "Authorization: Bearer $TOKEN"
  
# Retorna unitIds para uso em queries futuras
```

---

## 🤖 Integração com Assistente de IA

### Método Auxiliar para Filtros

O `EducationalUnitService` possui um método especial preparado para uso pelo assistente:

```typescript
// No service
async getUserAccessibleUnitIds(
  userId: string,
  userRole: UserRole,
  unitIds?: string[]
): Promise<string[]>

// Retorna IDs das unidades que o usuário pode acessar
// TI retorna todas
// Outros perfis retornam apenas suas unidades
```

### Uso no Assistente

Quando o assistente precisar buscar dados filtrados por unidade:

```typescript
// 1. Obter unidades do usuário
const filter = await unitService.getUnitFilterForUser(userId, userRole);

// 2. Usar no filtro de queries
if (filter.filterRequired) {
  // Aplicar filtro: WHERE unit_id IN (filter.unitIds)
  query = query.filter('unit_id', 'in', filter.unitIds);
} else {
  // TI - sem filtro, retorna tudo
}
```

---

## 🗂️ Estrutura de Arquivos

```
backend/src/
├── types/
│   └── unit.types.ts              # Interfaces e enums
├── repositories/
│   └── unit.repository.ts         # Acesso ao banco
├── services/
│   └── unit.service.ts            # Lógica de negócio + validações
├── controllers/
│   └── unit.controller.ts         # Handlers HTTP
└── routes/
    ├── unit.routes.ts             # Rotas de unidades
    └── user-unit.routes.ts        # Rotas de vínculos
```

---

## 🚀 Próximos Passos

### 1. Executar Schema SQL

```powershell
cd backend
.\setup-database.ps1
```

Ou execute manualmente no Supabase SQL Editor:
```sql
-- Cole o conteúdo de database/schema.sql
-- Inclui tabelas educational_units e user_units
```

### 2. Testar Endpoints

```powershell
# Inicie o servidor
npm run dev

# Faça login como TI
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@teste.com","password":"Admin@123"}'
$token = $response.data.token

# Crie uma unidade
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/educational-units" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"name":"Escola Teste","type":"school","code":"ET001"}'

# Liste unidades
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/educational-units" -Method Get -Headers @{Authorization="Bearer $token"}
```

### 3. Vincular Usuários

```powershell
# Obter ID de um usuário
$users = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users" -Method Get -Headers @{Authorization="Bearer $token"}
$userId = $users.data[0].id

# Vincular a unidades
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users/$userId/units" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"unit_ids":["unit-uuid-1"]}'
```

---

## 📝 Observações Importantes

1. **TI tem acesso global**: Não precisa de vínculos, pode ver/gerenciar tudo
2. **Vínculos são obrigatórios**: Para perfis não-TI acessarem dados
3. **Operação de vínculo é replace**: POST /users/:id/units remove vínculos antigos e cria novos
4. **Deleção protegida**: Não pode deletar unidade com usuários vinculados
5. **Prepared for AI**: Métodos `getUnitFilterForUser()` e `getUserAccessibleUnitIds()` prontos para uso pelo assistente

---

## 🎓 Exemplo de Governança

| Usuário | Perfil | Unidades Vinculadas | Pode Ver |
|---------|--------|---------------------|----------|
| Admin | TI | - | **Todas** as unidades |
| João | Diretor | Escola A, Escola B | Apenas dados de Escola A e B |
| Maria | Coordenação | Escola B | Apenas dados de Escola B |
| Pedro | Secretaria | Todas | Todas (vinculado manualmente) |

---

**✅ Sistema de unidades educacionais pronto para uso!**
