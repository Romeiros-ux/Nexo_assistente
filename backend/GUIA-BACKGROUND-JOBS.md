# 🚀 GUIA DE INSTALAÇÃO - Background Jobs com Bull/Redis

## 📋 PRÉ-REQUISITOS

### 1. ✅ Migration SQL Aplicada

Execute a migration no Supabase SQL Editor:

```bash
# Arquivo: backend/database/migrations/005_background_jobs.sql
```

**O que ela cria:**
- ✅ Tabela `document_indexing_jobs`
- ✅ Views: `v_indexing_jobs_stats`, `v_indexing_jobs_recent`, `v_indexing_jobs_failed`
- ✅ Funções: `create_indexing_job()`, `update_indexing_job_status()`, `increment_job_retry()`

### 2. ✅ Dependências NPM Instaladas

```bash
cd backend
npm install bull @types/bull ioredis @types/ioredis
```

### 3. ⚠️ Redis Instalado e Rodando

**Opção A: Redis Local (Windows)**

```powershell
# Instalar Redis via Chocolatey
choco install redis-64

# Ou baixar manualmente:
# https://github.com/microsoftarchive/redis/releases

# Iniciar Redis
redis-server

# Verificar se está rodando
redis-cli ping
# Resposta esperada: PONG
```

**Opção B: Redis via Docker (Recomendado)**

```powershell
# Instalar Docker Desktop: https://www.docker.com/products/docker-desktop/

# Iniciar Redis container
docker run -d --name redis-edu-ia -p 6379:6379 redis:latest

# Verificar se está rodando
docker ps
docker logs redis-edu-ia

# Testar conexão
redis-cli ping
```

**Opção C: Redis em Nuvem (Produção)**

Serviços gratuitos:
- **Upstash:** https://upstash.com/ (Recomendado, 10k comandos/dia grátis)
- **Redis Cloud:** https://redis.com/try-free/ (30MB grátis)
- **Render:** https://render.com/ (Redis grátis)

---

## ⚙️ CONFIGURAÇÃO

### 1. Variáveis de Ambiente

Adicione ao seu `.env` (copie de `.env.example`):

```env
# Redis Configuration (FASE 2.5 - Background Jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Para produção com Upstash:**
```env
REDIS_HOST=your-redis-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here
REDIS_DB=0
```

### 2. Iniciar Processor no Server

Edite `backend/src/server.ts` e adicione:

```typescript
import { startProcessor } from './queues/indexing.processor';

// ... código existente ...

// Iniciar processor de background jobs
startProcessor();

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Background jobs processor ativo`);
});
```

---

## 🧪 TESTE RÁPIDO

### 1. Verificar Redis

```powershell
# Conectar ao Redis CLI
redis-cli

# Dentro do Redis CLI:
127.0.0.1:6379> PING
PONG

127.0.0.1:6379> SET test "hello"
OK

127.0.0.1:6379> GET test
"hello"

127.0.0.1:6379> exit
```

### 2. Testar Fila Programaticamente

Crie um arquivo de teste:

```typescript
// backend/src/test-queue.ts
import indexingQueue from './queues/indexing.queue';

async function test() {
  console.log('🧪 Testando fila de indexação...\n');

  // 1. Stats iniciais
  const statsBefore = await indexingQueue.getStats();
  console.log('📊 Stats antes:', statsBefore);

  // 2. Adicionar job de teste
  const jobId = await indexingQueue.addDocument(
    'test-doc-id-123',
    'Documento de Teste.pdf'
  );
  console.log('\n✅ Job adicionado:', jobId);

  // 3. Aguardar 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Stats finais
  const statsAfter = await indexingQueue.getStats();
  console.log('\n📊 Stats depois:', statsAfter);

  // 5. Verificar status do job
  const status = await indexingQueue.getJobStatus(jobId);
  console.log('\n📝 Status do job:', status);

  process.exit(0);
}

test();
```

Execute:
```bash
npx ts-node src/test-queue.ts
```

**Saída esperada:**
```
🧪 Testando fila de indexação...

📊 Stats antes: { waiting: 0, active: 0, completed: 0, failed: 0, ... }

[IndexingQueue] Documento adicionado à fila: { document_id: 'test-doc-id-123', ... }
✅ Job adicionado: abc-123-def-456

📊 Stats depois: { waiting: 1, active: 0, completed: 0, failed: 0, ... }

📝 Status do job: { found: true, state: 'waiting', ... }
```

---

## 🔄 COMO USAR

### Uso Básico: Adicionar Documento na Fila

```typescript
import indexingQueue from './queues/indexing.queue';

// Adicionar documento único
const jobId = await indexingQueue.addDocument(
  documentId,    // UUID do documento
  documentName   // Nome do documento (para logs)
);

console.log(`Job criado: ${jobId}`);
```

### Uso Avançado: Batch de Documentos

```typescript
// Adicionar múltiplos documentos
const documents = [
  { id: 'doc-1', name: 'Lei 123/2023.pdf' },
  { id: 'doc-2', name: 'Regimento 2024.pdf' },
  { id: 'doc-3', name: 'PPP Escola A.pdf' },
];

const jobIds = await indexingQueue.addBatch(documents);
console.log(`${jobIds.length} jobs criados`);
```

### Monitoramento: Verificar Status

```typescript
// Status de um job específico
const status = await indexingQueue.getJobStatus(jobId);
console.log(status);

// Estatísticas da fila
const stats = await indexingQueue.getStats();
console.log(`
  Aguardando: ${stats.waiting}
  Processando: ${stats.active}
  Completados: ${stats.completed}
  Falhados: ${stats.failed}
`);
```

### Manutenção: Limpar Jobs Antigos

```typescript
// Limpar jobs completados/falhados há mais de 7 dias
await indexingQueue.cleanOldJobs(7 * 24 * 60 * 60 * 1000);
```

---

## 🎯 FLUXO COMPLETO

```
1. UPLOAD DE DOCUMENTO
   ↓
2. CRIAR JOB NA FILA
   await indexingQueue.addDocument(docId, docName)
   ↓
3. JOB SALVO NO BANCO (document_indexing_jobs)
   status: NOT_STARTED
   ↓
4. JOB ADICIONADO NA FILA BULL (Redis)
   ↓
5. PROCESSOR CONSOME JOB
   [IndexingProcessor] Iniciando job...
   ↓
6. INDEXAÇÃO EXECUTADA
   - Busca versão não-indexada
   - Gera chunks
   - Gera embeddings
   - Salva no banco
   ↓
7. STATUS ATUALIZADO
   status: COMPLETED (ou INDEXING_FAILED)
   ↓
8. RESULTADO RETORNADO
   { success: true, chunks: 48, cost: $0.0012, ... }
```

---

## 📊 MONITORAMENTO VIA SQL

### Ver Jobs Recentes

```sql
SELECT * FROM v_indexing_jobs_recent LIMIT 10;
```

### Ver Estatísticas Gerais

```sql
SELECT * FROM v_indexing_jobs_stats;
```

### Ver Jobs Falhados (para retry)

```sql
SELECT * FROM v_indexing_jobs_failed;
```

### Ver Jobs em Progresso

```sql
SELECT 
  j.id,
  j.bull_job_id,
  d.name AS document_name,
  j.started_at,
  EXTRACT(EPOCH FROM (NOW() - j.started_at)) AS seconds_running
FROM document_indexing_jobs j
JOIN documents d ON d.id = j.document_id
WHERE j.status = 'IN_PROGRESS'
ORDER BY j.started_at DESC;
```

---

## 🐛 TROUBLESHOOTING

### Problema: "ECONNREFUSED 127.0.0.1:6379"

**Causa:** Redis não está rodando  
**Solução:**
```bash
# Verificar se Redis está ativo
redis-cli ping

# Se não responder, iniciar Redis
redis-server

# Ou via Docker:
docker start redis-edu-ia
```

### Problema: Jobs não são processados

**Causa:** Processor não foi iniciado  
**Solução:** Verificar se `startProcessor()` está chamado em `server.ts`

```typescript
import { startProcessor } from './queues/indexing.processor';
startProcessor(); // ← Adicionar esta linha
```

### Problema: Jobs ficam "stuck" (travados)

**Causa:** Processor travou ou servidor caiu  
**Solução:** Jobs em estado "active" por mais de 30min são considerados stalled

```typescript
// Bull automaticamente retenta jobs stalled
// Você pode forçar retry:
await indexingQueue.retryJob(jobId);
```

### Problema: Muitos jobs falhando

**Verificar:**
1. Logs do processor: `[IndexingProcessor] Erro no job...`
2. Tabela `document_indexing_jobs` campo `error_message`
3. OpenAI API key válida
4. Supabase conexão ativa

```sql
-- Ver erros mais comuns
SELECT 
  error_message,
  COUNT(*) as occurrences
FROM document_indexing_jobs
WHERE status = 'INDEXING_FAILED'
GROUP BY error_message
ORDER BY occurrences DESC;
```

---

## 🎛️ CONFIGURAÇÕES AVANÇADAS

### Ajustar Concorrência

Em `indexing.processor.ts`:

```typescript
queue.process(
  'indexing-worker',
  5, // ← Alterar para 5 jobs simultâneos
  processIndexingJob
);
```

**Recomendações:**
- **Desenvolvimento:** 1-2
- **Produção (servidor pequeno):** 2-3
- **Produção (servidor médio/grande):** 5-10

### Ajustar Retry

Em `indexing.queue.ts`:

```typescript
defaultJobOptions: {
  attempts: 5, // ← Alterar para 5 tentativas
  backoff: {
    type: 'exponential',
    delay: 10000, // ← 10s, 20s, 40s, 80s, 160s
  },
}
```

### Priorização de Jobs

```typescript
// Job de alta prioridade (processado primeiro)
await indexingQueue.addDocument(docId, docName, {
  priority: 0, // 0 = maior prioridade
});

// Job de baixa prioridade
await indexingQueue.addDocument(docId, docName, {
  priority: 10, // 10 = menor prioridade
});
```

---

## ✅ CHECKLIST DE INSTALAÇÃO

- [ ] Migration 005 aplicada no Supabase
- [ ] Dependências NPM instaladas (`bull`, `ioredis`)
- [ ] Redis instalado e rodando
- [ ] Variáveis Redis no `.env`
- [ ] `startProcessor()` chamado em `server.ts`
- [ ] Teste rápido executado com sucesso
- [ ] Primeiro job real processado

---

## 🚀 PRÓXIMOS PASSOS

Após instalação completa:

1. ✅ **Integrar com upload de documentos**
   - Modificar `unified-knowledge-indexer.ts`
   - Chamar `indexingQueue.addDocument()` após upload

2. ✅ **Criar dashboard de monitoramento**
   - Endpoint HTTP `/api/jobs/stats`
   - Endpoint HTTP `/api/jobs/:id`
   - Tela no frontend para visualizar

3. ✅ **Deploy em produção**
   - Usar Redis em nuvem (Upstash)
   - Configurar worker separado (opcional)
   - Monitorar logs e métricas

---

**🎉 Sistema de Background Jobs pronto para uso!**
