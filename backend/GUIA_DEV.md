# 🚀 Guia de Desenvolvimento - Backend

## ✅ SISTEMA FUNCIONANDO

**Status:** Backend 100% operacional após correção do tsx watch

### 🔧 Comandos para Desenvolver

```bash
cd backend

# Desenvolvimento (recompila automaticamente)
npm run dev

# Ou manualmente:
npm run build  # Compila TypeScript → JavaScript
npm start      # Inicia servidor

# Produção
npm run start:prod
```

### 📡 Endpoints Disponíveis

**Health Check:**
- http://127.0.0.1:3001/health

**API Info:**
- http://127.0.0.1:3001
- http://127.0.0.1:3001/api/v1

**Chat (FASE 3):**
- POST /api/v1/chat/ask
- GET /api/v1/chat/history
- GET /api/v1/chat/stats (TI only)
- GET /api/v1/chat/popular (TI only)
- GET /api/v1/chat/documents/most-cited (TI only)

### 🗄️ Banco de Dados

**Tabelas Criadas (Migration 004):**
- ✅ `chat_logs` - Auditoria de interações
- ✅ `chat_citations` - Rastreabilidade de documentos
- ✅ `v_chat_stats` - Estatísticas agregadas
- ✅ `v_popular_queries` - Queries mais frequentes
- ✅ `v_most_cited_documents` - Documentos mais citados

### 🧪 Como Testar

**1. Navegador:**
- Abra: http://127.0.0.1:3001/health

**2. VS Code REST Client:**
- Abra: `backend/test-chat.http`
- Clique em "Send Request" acima de cada teste

**3. Postman/Insomnia:**
- Importe collection ou teste manualmente

### 🐛 Problema Resolvido

**Causa:** `tsx watch` não estava fazendo bind correto da porta
**Solução:** Usar `tsc` + `node` para ambiente de dev

### 📝 Próximos Passos

- [x] Backend funcionando
- [x] Migration 004 aplicada
- [ ] Testar POST /chat/ask com JWT
- [ ] ETAPA 5: Frontend ChatPage.tsx
- [ ] ETAPA 6: Testes institucionais
- [ ] ETAPA 7: Documentação final
