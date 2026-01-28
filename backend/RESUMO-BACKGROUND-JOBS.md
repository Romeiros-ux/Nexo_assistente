# ✅ BACKGROUND JOBS - IMPLEMENTAÇÃO COMPLETA

**Status:** 🟢 **80% CONCLUÍDO** - Pronto para testar!

---

## 📦 O QUE FOI CRIADO

### 1. **Migration SQL** ✅
📁 `backend/database/migrations/005_background_jobs.sql`

- ✅ Tabela `document_indexing_jobs` (controle de jobs)
- ✅ 3 Views para monitoramento
- ✅ 3 Funções auxiliares (criar job, atualizar status, incrementar retry)
- ✅ RLS policies aplicadas

### 2. **Serviço de Fila** ✅
📁 `backend/src/queues/indexing.queue.ts`

- ✅ Integração com Bull/Redis
- ✅ Adicionar documentos na fila
- ✅ Monitorar status de jobs
- ✅ Retry automático (3 tentativas)
- ✅ Event handlers completos

### 3. **Job Processor** ✅
📁 `backend/src/queues/indexing.processor.ts`

- ✅ Worker que processa jobs em background
- ✅ Concorrência: 2 jobs simultâneos
- ✅ Integração com IndexingService
- ✅ Atualização de status no banco
- ✅ Health check e métricas

### 4. **Guia de Instalação** ✅
📁 `backend/GUIA-BACKGROUND-JOBS.md`

- ✅ Instruções completas de setup
- ✅ Configuração Redis (local + cloud)
- ✅ Testes e troubleshooting
- ✅ Exemplos de uso

### 5. **Dependências Instaladas** ✅
```
✅ bull@4.x
✅ @types/bull
✅ ioredis@5.x
✅ @types/ioredis
```

---

## 🚀 PRÓXIMOS PASSOS (VOCÊ PRECISA FAZER)

### **PASSO 1: Aplicar Migration no Supabase** ⚠️

1. Abra o Supabase SQL Editor
2. Cole o conteúdo de `backend/database/migrations/005_background_jobs.sql`
3. Execute
4. Verifique mensagem de sucesso: "✅ Migration 005 aplicada com sucesso!"

### **PASSO 2: Instalar e Iniciar Redis** ⚠️

**Opção A: Redis via Docker (Recomendado)**
```powershell
# Instalar Docker Desktop se não tiver
# https://www.docker.com/products/docker-desktop/

# Iniciar container Redis
docker run -d --name redis-edu-ia -p 6379:6379 redis:latest

# Verificar se está rodando
docker ps
redis-cli ping  # Deve retornar: PONG
```

**Opção B: Redis Local (Windows)**
```powershell
# Instalar via Chocolatey
choco install redis-64

# Ou baixar manualmente
# https://github.com/microsoftarchive/redis/releases

# Iniciar
redis-server
```

**Opção C: Redis em Nuvem (Produção)**
- Upstash: https://upstash.com/ (10k comandos/dia grátis)
- Redis Cloud: https://redis.com/try-free/

### **PASSO 3: Configurar Variáveis de Ambiente** ⚠️

Adicione ao seu `backend/.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### **PASSO 4: Iniciar Processor no Server** ⚠️

Edite `backend/src/server.ts`:

```typescript
// No topo do arquivo
import { startProcessor } from './queues/indexing.processor';

// ... código existente ...

// ADICIONAR ANTES DO app.listen():
startProcessor();

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Background jobs processor ativo`); // ← Nova linha
});
```

### **PASSO 5: Teste Rápido** ⚠️

Crie arquivo de teste: `backend/src/test-queue.ts`

```typescript
import indexingQueue from './queues/indexing.queue';

async function test() {
  console.log('🧪 Testando fila...\n');

  // Ver stats
  const stats = await indexingQueue.getStats();
  console.log('📊 Stats:', stats);

  // Adicionar job de teste
  const jobId = await indexingQueue.addDocument(
    'test-123',
    'Teste.pdf'
  );
  console.log('\n✅ Job criado:', jobId);

  // Ver status
  setTimeout(async () => {
    const status = await indexingQueue.getJobStatus(jobId);
    console.log('\n📝 Status:', status);
    process.exit(0);
  }, 2000);
}

test();
```

Execute:
```bash
cd backend
npx ts-node src/test-queue.ts
```

**Resultado esperado:**
```
🧪 Testando fila...

📊 Stats: { waiting: 0, active: 0, completed: 0, ... }
[IndexingQueue] Documento adicionado à fila
✅ Job criado: abc-123-def

📝 Status: { found: true, state: 'waiting', ... }
```

---

## 🎯 COMO USAR NO CÓDIGO

### Exemplo 1: Adicionar Documento na Fila

```typescript
import indexingQueue from './queues/indexing.queue';

// Após upload de documento
const jobId = await indexingQueue.addDocument(
  documentId,    // UUID do documento
  documentName   // Nome (para logs)
);

console.log(`Job criado: ${jobId}`);
// Documento será processado em background!
```

### Exemplo 2: Batch de Documentos

```typescript
const documents = [
  { id: 'doc-1', name: 'Lei 123.pdf' },
  { id: 'doc-2', name: 'Regimento.pdf' },
];

const jobIds = await indexingQueue.addBatch(documents);
console.log(`${jobIds.length} jobs criados`);
```

### Exemplo 3: Monitorar Status

```typescript
// Status específico
const status = await indexingQueue.getJobStatus(jobId);

// Estatísticas gerais
const stats = await indexingQueue.getStats();
console.log(`Fila: ${stats.waiting} aguardando, ${stats.active} processando`);
```

---

## 🔍 MONITORAMENTO VIA SQL

```sql
-- Ver jobs recentes
SELECT * FROM v_indexing_jobs_recent LIMIT 10;

-- Ver estatísticas
SELECT * FROM v_indexing_jobs_stats;

-- Ver jobs falhados (para retry manual)
SELECT * FROM v_indexing_jobs_failed;
```

---

## ⚠️ CHECKLIST ANTES DE USAR

- [ ] Migration 005 aplicada no Supabase
- [ ] Redis instalado e rodando (`redis-cli ping` → PONG)
- [ ] Variáveis REDIS_* no `.env`
- [ ] Dependências instaladas (`npm install`)
- [ ] `startProcessor()` em `server.ts`
- [ ] Teste rápido executado com sucesso

---

## 🎉 PRÓXIMA ETAPA

Depois de tudo funcionando:

1. **Integrar com upload real** - Modificar `unified-knowledge-indexer.ts` para usar a fila
2. **Criar dashboard** - Endpoint HTTP para visualizar jobs
3. **Deploy** - Usar Redis em nuvem (Upstash) para produção

---

## 📚 DOCUMENTAÇÃO COMPLETA

Veja o guia detalhado: `backend/GUIA-BACKGROUND-JOBS.md`

---

**Status Final:** Sistema pronto para testar! Siga os 5 passos acima e terá background jobs funcionando. 🚀
