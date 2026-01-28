# 🔒 Row Level Security (RLS) - Guia de Implementação

## 📋 O Que É RLS?

**Row Level Security (RLS)** é um recurso do PostgreSQL que permite aplicar políticas de segurança diretamente no nível do banco de dados. Com RLS, cada linha (row) de uma tabela pode ser visível ou não para um usuário, dependendo de regras definidas.

## 🎯 Por Que Usar RLS?

### **Segurança Independente do Código**
- Mesmo que o frontend seja hackeado, os dados ficam protegidos
- Mesmo que haja bugs no backend, o banco não entrega dados indevidos
- Políticas aplicadas ANTES dos dados saírem do banco

### **Governança Automática**
- Diretor só vê escolas vinculadas a ele (automático)
- TI vê tudo (automático)
- Secretaria vê toda a rede (automático)
- Não depende de lógica no código - está no banco

### **Auditabilidade**
- Políticas documentadas e versionadas
- Fácil de revisar e validar
- Conformidade com LGPD garantida no banco

---

## 🏗️ Arquitetura de Segurança

```
┌─────────────────────────────────────────────────────────┐
│ CAMADA 1: Frontend (React)                              │
│ → Envia requisição com token JWT                        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│ CAMADA 2: Backend (Express + Middleware)                │
│ → Valida token JWT                                      │
│ → Verifica perfil do usuário                            │
│ → Aplica lógica de negócio adicional                    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│ CAMADA 3: Banco de Dados (PostgreSQL + RLS)             │
│ → Aplica políticas RLS AUTOMATICAMENTE                  │
│ → Filtra linhas baseado no auth.uid()                   │
│ → Retorna APENAS dados que o usuário pode ver           │
└─────────────────────────────────────────────────────────┘
```

**Resultado:** Segurança em profundidade (defense in depth)

---

## 📁 Arquivos Criados

### **`rls-policies.sql`**
Contém todas as políticas RLS do sistema:
- Habilita RLS nas tabelas
- Define políticas por perfil e operação
- Cria funções auxiliares
- Documentação completa

**Localização:** `backend/database/rls-policies.sql`

---

## 🚀 Como Aplicar no Supabase

### **Passo 1: Acesse o Supabase Dashboard**
1. Entre no [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto

### **Passo 2: Abra o SQL Editor**
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### **Passo 3: Execute o Script**
1. Abra o arquivo `backend/database/rls-policies.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"**

### **Passo 4: Verifique as Políticas**
1. Vá em **"Database"** → **"Policies"** no menu lateral
2. Você deve ver:
   - **users:** 6 políticas
   - **educational_units:** 6 políticas
   - **user_units:** 4 políticas

### **Passo 5: Verifique as Funções**
1. Vá em **"Database"** → **"Functions"** no menu lateral
2. Você deve ver:
   - `has_global_access`
   - `get_accessible_unit_ids`
   - `can_access_unit`

---

## 🔍 Como as Políticas Funcionam

### **Exemplo 1: Diretor Consultando Unidades**

```sql
-- Quando um Diretor faz SELECT em educational_units:

SELECT * FROM educational_units;

-- O RLS aplica automaticamente a política:
-- "diretor_coordenacao_select_own_units"

-- Resultado: Retorna APENAS unidades onde EXISTS (
--   SELECT 1 FROM user_units 
--   WHERE user_id = auth.uid() 
--   AND unit_id = educational_units.id
-- )
```

**Sem RLS:** Retornaria todas as 45 escolas  
**Com RLS:** Retorna apenas as 2 escolas do diretor

### **Exemplo 2: TI Criando Usuário**

```sql
-- Quando TI tenta INSERT em users:

INSERT INTO users (name, email, role) VALUES (...);

-- RLS verifica política "ti_insert_users"

-- Se auth.uid() corresponde a um usuário com role='TI':
--   ✅ INSERT permitido
-- Caso contrário:
--   ❌ INSERT negado (erro: "policy violation")
```

### **Exemplo 3: Usuário Comum Tentando Ver Todos os Usuários**

```sql
-- Quando Diretor tenta SELECT em users:

SELECT * FROM users;

-- RLS aplica políticas disponíveis:
-- 1. "ti_select_all_users" → Não se aplica (não é TI)
-- 2. "users_select_own" → Aplica (retorna só seu registro)

-- Resultado: Retorna APENAS o registro do próprio usuário
```

---

## 🛡️ Políticas Implementadas

### **Tabela: users**

| Política | Operação | Quem | O Que Pode |
|----------|----------|------|------------|
| `ti_select_all_users` | SELECT | TI | Ver todos os usuários |
| `users_select_own` | SELECT | Todos | Ver próprio registro |
| `ti_insert_users` | INSERT | TI | Criar usuários |
| `ti_update_users` | UPDATE | TI | Atualizar qualquer usuário |
| `users_update_own` | UPDATE | Todos | Atualizar próprio registro (exceto role) |
| `ti_delete_users` | DELETE | TI | Deletar usuários |

### **Tabela: educational_units**

| Política | Operação | Quem | O Que Pode |
|----------|----------|------|------------|
| `ti_secretaria_select_all_units` | SELECT | TI, Secretaria | Ver todas as unidades |
| `comissao_select_all_units` | SELECT | Comissão | Ver todas (read-only) |
| `diretor_coordenacao_select_own_units` | SELECT | Diretor, Coordenação | Ver unidades vinculadas |
| `ti_insert_units` | INSERT | TI | Criar unidades |
| `ti_update_units` | UPDATE | TI | Atualizar unidades |
| `ti_delete_units` | DELETE | TI | Deletar unidades |

### **Tabela: user_units**

| Política | Operação | Quem | O Que Pode |
|----------|----------|------|------------|
| `ti_select_all_user_units` | SELECT | TI | Ver todos os vínculos |
| `users_select_own_units` | SELECT | Todos | Ver próprios vínculos |
| `ti_insert_user_units` | INSERT | TI | Criar vínculos |
| `ti_delete_user_units` | DELETE | TI | Deletar vínculos |

---

## 🧪 Como Testar

### **Teste 1: Criar Usuário Diretor**
```sql
-- Como TI (deve funcionar)
INSERT INTO users (name, email, password, role, status)
VALUES ('João Silva', 'joao@escola.com', 'hash...', 'Diretor', 'active');
```

### **Teste 2: Vincular Diretor a Escola**
```sql
-- Como TI (deve funcionar)
INSERT INTO user_units (user_id, unit_id)
VALUES (
  (SELECT id FROM users WHERE email = 'joao@escola.com'),
  (SELECT id FROM educational_units WHERE code = 'EM001')
);
```

### **Teste 3: Login como Diretor e Consultar Unidades**
```javascript
// No frontend, após login como joao@escola.com:
const { data, error } = await supabase
  .from('educational_units')
  .select('*');

// Resultado: Retorna APENAS a escola EM001
// (apesar do SELECT * não ter filtro explícito!)
```

### **Teste 4: Diretor Tentando Ver Outro Diretor**
```javascript
// Como joao@escola.com:
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'Diretor');

// Resultado: Retorna APENAS o próprio João
// (RLS bloqueia acesso a outros diretores)
```

---

## ⚠️ Importante: auth.uid()

As políticas RLS usam `auth.uid()` do Supabase Auth.

**No nosso sistema:**
- Backend usa JWT próprio (não Supabase Auth diretamente)
- Precisamos sincronizar: quando usuário loga via JWT, deve haver correspondência com Supabase Auth

**Solução:**
1. Criar função no backend que sincroniza JWT → Supabase Auth UID
2. OU: Migrar autenticação para Supabase Auth (recomendado a longo prazo)
3. OU: Usar `SECURITY DEFINER` functions com parâmetro de user_id

**Implementação Atual:**
Por ora, o RLS está preparado para quando integrarmos Supabase Auth. Enquanto isso, a segurança é garantida pelas camadas 1 e 2 (Frontend + Backend).

---

## 🔄 Manutenção

### **Adicionar Nova Política**
```sql
-- Exemplo: Permitir Secretaria criar unidades
CREATE POLICY "secretaria_insert_units" ON educational_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Secretaria de Educação'
      AND users.status = 'active'
    )
  );
```

### **Remover Política**
```sql
DROP POLICY IF EXISTS "nome_da_politica" ON nome_da_tabela;
```

### **Desabilitar RLS (NUNCA EM PRODUÇÃO!)**
```sql
-- Apenas para debug em ambiente local
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## 📊 Benefícios Medidos

| Aspecto | Sem RLS | Com RLS |
|---------|---------|---------|
| Segurança | Depende do código | Garantida no banco |
| Vulnerabilidade | Frontend comprometido = dados expostos | Dados protegidos mesmo com frontend comprometido |
| Bugs | Pode vazar dados | Banco impede vazamento |
| Auditoria | Lógica espalhada | Políticas centralizadas |
| Performance | N+1 queries comuns | Filtros nativos otimizados |
| Conformidade LGPD | Manual | Automática |

---

## 🎓 Recursos Adicionais

- [Documentação Oficial PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentação Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Best Practices Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## ✅ Checklist de Implementação

- [ ] Aplicar `rls-policies.sql` no Supabase Dashboard
- [ ] Verificar políticas criadas em Database → Policies
- [ ] Verificar funções criadas em Database → Functions
- [ ] Testar com usuário TI (deve ver tudo)
- [ ] Testar com usuário Diretor (deve ver só suas unidades)
- [ ] Testar com usuário Secretaria (deve ver toda a rede)
- [ ] Testar tentativa de acesso indevido (deve falhar)
- [ ] Documentar integração com Supabase Auth (futuro)
- [ ] Adicionar testes automatizados de RLS

---

**Última Atualização:** 9 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** Pronto para aplicação em ambiente de desenvolvimento
