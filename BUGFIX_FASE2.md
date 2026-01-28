# 🐛 Correção de Bugs - FASE 2

## 📋 Problemas Encontrados nos Logs

### ❌ PROBLEMA 1: ConversationId Incorreto no Frontend

**Sintoma:**
```javascript
conversationId: 'nova conversa'  // ❌ String literal fixa
```

**Causa Raiz:**
- Frontend enviava string `'nova conversa'` em TODAS as requisições
- Backend interpretava como conversação existente
- Tentava buscar UUID `'nova conversa'` no banco → não encontrava
- Criava nova conversação em CADA pergunta
- **Contexto perdido completamente**

**Evidência nos Logs:**
```
[ChatService] Nova conversa criada: 947e61d9-e761-44ba-8cc5-df17ca3f926c
[ChatService] Nova conversa criada: df127b8f-5127-417c-8abb-731ed8dbb39a
```
↑ Duas conversas diferentes para 2 perguntas sequenciais!

**Solução Implementada:**

1. **Adicionado campo `backendConversationId` ao Conversation (frontend)**
   ```typescript
   export interface Conversation {
     id: string;  // ID local do frontend (timestamp)
     backendConversationId?: string;  // UUID do backend (Supabase)
     title: string;
     messages: Message[];
     // ...
   }
   ```

2. **Criado método `updateBackendConversationId()` no ConversationsContext**
   ```typescript
   const updateBackendConversationId = (frontendId: string, backendId: string) => {
     setConversations(prev => prev.map(conv => 
       conv.id === frontendId ? { ...conv, backendConversationId: backendId } : conv
     ));
   };
   ```

3. **Modificado `handleSendMessage()` em Chat.tsx**
   ```typescript
   // Antes (ERRADO):
   const response = await chatService.ask({
     query: content,
     conversationId: conversationId  // ❌ Timestamp do frontend
   });

   // Depois (CORRETO):
   const backendId = currentConversation?.backendConversationId;
   const response = await chatService.ask({
     query: content,
     conversationId: backendId  // ✅ UUID do backend (ou undefined)
   });

   // Salva UUID retornado:
   if (response.data.conversationId && conversationId) {
     updateBackendConversationId(conversationId, response.data.conversationId);
   }
   ```

4. **Atualizado interface `ChatAskRequest`**
   ```typescript
   export interface ChatAskRequest {
     query: string;
     conversationId?: string;  // ✅ Agora aceita UUID do backend
     filters?: { ... };
   }
   ```

**Resultado Esperado:**
- ✅ Primeira pergunta: `conversationId` = undefined → cria nova conversa
- ✅ Segunda pergunta: `conversationId` = UUID retornado → usa mesma conversa
- ✅ Contexto mantido entre perguntas

---

### ⚠️ PROBLEMA 2: User ID Não Existe na Tabela users

**Sintoma:**
```
[ChatService] Erro ao salvar chat_logs: {
  code: '23503',
  details: 'Key (user_id)=(362c91a1-a2db-4f8f-a064-01da9c98e9e9) is not present in table "users".',
  message: 'insert or update on table "chat_logs" violates foreign key constraint "chat_logs_user_id_fkey"'
}
```

**Causa Raiz:**
- User ID `362c91a1-a2db-4f8f-a064-01da9c98e9e9` não existe em `users`
- Possivelmente usuário de teste criado apenas no Supabase Auth
- Não foi inserido na tabela `public.users`
- Foreign key constraint está bloqueando insert

**Impacto:**
- ⚠️ Conversações funcionam (nova tabela sem FK para users)
- ❌ Chat logs não são salvos (tabela antiga com FK)
- Sistema funciona, mas sem histórico de logs

**Solução Necessária:**

**Opção 1: Criar usuário na tabela users**
```sql
-- Execute no Supabase SQL Editor:
INSERT INTO users (id, email, role, name, status, created_at)
VALUES (
  '362c91a1-a2db-4f8f-a064-01da9c98e9e9',
  'admin@teste.com',  -- Substitua pelo email correto
  'TI',
  'Administrador Teste',
  'active',
  NOW()
);
```

**Opção 2: Usar trigger para criar usuário automaticamente**
```sql
-- Trigger para criar registro em users quando novo usuário de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, name, status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'DIRETOR',  -- Role padrão
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'active',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Opção 3: Remover FK constraint (NÃO RECOMENDADO)**
```sql
-- ⚠️ Só em último caso:
ALTER TABLE chat_logs DROP CONSTRAINT chat_logs_user_id_fkey;
```

---

## ✅ Arquivos Modificados

### Frontend:
1. **src/pages/Chat.tsx**
   - Usa `backendConversationId` nas chamadas API
   - Salva UUID retornado em updateBackendConversationId()

2. **src/contexts/ConversationsContext.tsx**
   - Adiciona campo `backendConversationId?: string`
   - Implementa `updateBackendConversationId()`
   - Exporta método no contexto

3. **src/lib/chatService.ts**
   - Atualiza `ChatAskRequest` com `conversationId?: string`

### Commits:
```
cae88bd - fix(frontend): sincroniza conversationId entre frontend e backend
```

---

## 🧪 Como Testar

### Teste 1: Validar Sincronização de ConversationId

1. **Abra DevTools (F12) → Aba Network**

2. **Faça primeira pergunta:**
   ```
   Qual o IDEB de 2023?
   ```
   - Verifique request: `conversationId` deve ser `undefined` ou não estar presente
   - Verifique response: `conversationId` deve ser um UUID
   - **Copie o UUID retornado**

3. **Faça segunda pergunta:**
   ```
   E dos anos finais?
   ```
   - Verifique request: `conversationId` deve ser o **mesmo UUID** da resposta anterior
   - Verifique response: `conversationId` deve permanecer igual
   - **Resposta deve entender "anos finais" = Anos Finais do IDEB**

4. **Resultado Esperado:**
   ```
   ✅ Request 1: conversationId = undefined
   ✅ Response 1: conversationId = "947e61d9-e761-44ba-8cc5-df17ca3f926c"
   ✅ Request 2: conversationId = "947e61d9-e761-44ba-8cc5-df17ca3f926c"
   ✅ Response 2: conversationId = "947e61d9-e761-44ba-8cc5-df17ca3f926c"
   ✅ Contexto mantido: "E dos anos finais?" entende que fala sobre IDEB
   ```

---

### Teste 2: Verificar Mensagens no Banco

```sql
-- Execute no Supabase SQL Editor:

-- 1. Listar conversas do usuário
SELECT id, title, created_at, updated_at
FROM conversations
WHERE user_id = '362c91a1-a2db-4f8f-a064-01da9c98e9e9'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Ver mensagens de uma conversa (substitua o ID):
SELECT role, content, created_at, metadata
FROM conversation_messages
WHERE conversation_id = '947e61d9-e761-44ba-8cc5-df17ca3f926c'
ORDER BY created_at ASC;

-- Esperado:
-- 1. user: "Qual o IDEB de 2023?"
-- 2. assistant: "Em 2023, o IDEB dos Anos Iniciais..."
-- 3. user: "E dos anos finais?"
-- 4. assistant: "Para os Anos Finais em 2023..." (resposta com contexto!)
```

---

### Teste 3: Corrigir User ID (Se Necessário)

```sql
-- Verificar se usuário existe:
SELECT id, email, role FROM users WHERE id = '362c91a1-a2db-4f8f-a064-01da9c98e9e9';

-- Se retornar vazio, criar:
INSERT INTO users (id, email, role, name, status, created_at)
VALUES (
  '362c91a1-a2db-4f8f-a064-01da9c98e9e9',
  'admin@teste.com',
  'TI',
  'Administrador Teste',
  'active',
  NOW()
);
  'TI',
  'Administrador Teste',
  NOW()
);

-- Verificar novamente:
SELECT id, email, role FROM users WHERE email = 'admin@teste.com';
```

---

## 📊 Status Final

| Item | Status | Descrição |
|------|--------|-----------|
| ✅ Bug conversationId | **CORRIGIDO** | Frontend agora usa UUID do backend |
| ✅ Código compilado | **OK** | `npm run build` sem erros |
| ✅ Commit realizado | **OK** | Commit `cae88bd` |
| ⚠️ User ID missing | **PENDENTE** | Usuário precisa executar SQL |
| ⏳ Teste manual | **AGUARDANDO** | Usuário precisa testar no sistema |

---

## 🎯 Próximos Passos

1. ✅ **Frontend corrigido** - pronto para testar
2. ⏳ **Executar SQL** para criar usuário na tabela users (se erro persistir)
3. ⏳ **Testar manualmente** no sistema web:
   - Fazer 2-3 perguntas consecutivas
   - Verificar se contexto é mantido
   - Conferir conversationId no Network tab

4. ✅ **FASE 2 completa** se testes passarem!

---

## 🔍 Diagnóstico Rápido

**Se contexto não estiver funcionando:**

1. Abra DevTools → Network
2. Procure request `POST /api/v1/chat/ask`
3. Verifique:
   - ❌ Se `conversationId` = "nova conversa" → BUG AINDA PRESENTE
   - ✅ Se `conversationId` = UUID ou undefined → CORRETO

**Se erro de user_id persistir:**

1. Execute query no Supabase:
   ```sql
   SELECT id FROM users WHERE id = '362c91a1-a2db-4f8f-a064-01da9c98e9e9';
   ```
2. Se retornar vazio → executar INSERT da Opção 1 acima
3. Testar novamente

