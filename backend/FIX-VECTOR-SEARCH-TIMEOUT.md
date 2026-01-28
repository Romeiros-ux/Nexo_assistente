# 🔧 CORREÇÃO: Timeout na Busca Vetorial

## 📋 Problema Identificado

**Sintoma:**
```
[SearchService] ❌ Erro na busca: Error: Erro na busca vetorial: 
canceling statement due to statement timeout
POST /api/v1/chat/ask 200 523 - 8704.955 ms
```

**Causa Raiz:**
- **3,349 documentos indexados** (~100,000 embeddings)
- **Sem índice vetorial otimizado** (busca sequencial O(n))
- **Timeout do Supabase** em 2-3 segundos (padrão muito baixo)
- Busca vetorial demorando **8-9 segundos** por query

## ✅ Soluções Implementadas

### 1. Script SQL de Otimização (CRÍTICO)

**Arquivo:** `backend/scripts/fix-vector-search-performance.sql`

**O que faz:**
- Remove índice antigo ineficiente
- Cria índice **HNSW** (Hierarchical Navigable Small World)
- Aumenta `statement_timeout` de 2s para 30s
- Analisa estatísticas da tabela

**Performance Esperada:**
- **ANTES:** 8,000-9,000ms com timeout
- **DEPOIS:** 50-200ms ✅

**⚠️ EXECUTE ESTE SCRIPT AGORA NO SUPABASE:**

1. Acesse: https://supabase.com/dashboard
2. Vá em: **SQL Editor**
3. Cole o conteúdo de `fix-vector-search-performance.sql`
4. Clique em **RUN**
5. Aguarde **5-15 minutos** para o índice ser criado

### 2. Timeout no Cliente (JÁ APLICADO)

**Arquivos modificados:**
- `backend/src/config/supabase.ts` - Headers customizados
- `backend/src/services/search.service.ts` - AbortController com 30s timeout

**Mudanças:**
```typescript
// Timeout customizado de 30 segundos
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const { data, error } = await supabase.rpc('match_chunks', params, {
  signal: controller.signal
});
```

### 3. Mensagens de Erro Melhoradas

**Antes:**
```
❌ Erro na busca: canceling statement due to statement timeout
```

**Depois:**
```
❌ Timeout na busca vetorial após 30 segundos. 
Por favor, execute o script SQL de otimização.
```

## 🚀 Passos para Resolver

### Passo 1: Executar Script SQL (OBRIGATÓRIO)

```bash
# 1. Abra o arquivo SQL
code backend/scripts/fix-vector-search-performance.sql

# 2. Copie TODO o conteúdo

# 3. Acesse Supabase Dashboard > SQL Editor

# 4. Cole e execute

# 5. Aguarde mensagem de sucesso:
# "CREATE INDEX"
# "ALTER DATABASE"
```

**Tempo estimado:** 10-15 minutos

### Passo 2: Reiniciar Backend

```bash
cd backend
npm run dev
```

### Passo 3: Testar Busca

```bash
# Faça uma pergunta no chat:
"Qual a Lei mais recente sobre educação em Saquarema?"

# Verifique no log:
[SearchService] Busca iniciada...
[EmbeddingService] Gerando embedding: 14 tokens
[SearchService] 5 chunks encontrados ✅
POST /api/v1/chat/ask 200 - 250ms ✅
```

## 📊 Índice HNSW Explicado

**O que é HNSW?**
- Algoritmo de busca aproximada de vizinhos mais próximos
- Estrutura hierárquica de grafos navegáveis
- **Complexidade:** O(log n) vs O(n) sequencial

**Parâmetros:**
- `m = 16`: Número de conexões por layer (qualidade)
- `ef_construction = 64`: Qualidade na construção do índice
- `vector_cosine_ops`: Operador para cosine similarity

**Trade-offs:**
- ✅ **50-200x mais rápido** que busca sequencial
- ✅ 99%+ de precisão (quase exato)
- ⚠️ Usa mais memória (~30% extra)
- ⚠️ Build time de 10-15 min para 100k vetores

## 🔍 Verificação de Sucesso

### Logs de Sucesso (ANTES do índice)
```
[SearchService] Busca iniciada: { query: 'Lei educação' }
[SearchService] ❌ Erro: statement timeout
POST /api/v1/chat/ask 200 - 8704ms ❌
```

### Logs de Sucesso (DEPOIS do índice)
```
[SearchService] Busca iniciada: { query: 'Lei educação' }
[SearchService] Embedding gerado: 10 tokens
[SearchService] 5 chunks encontrados
[SearchService] Top 5 documentos antes do re-ranking:
  1. Lei nº 2232/2022 - Similarity: 72.3%
  2. Lei nº 2667/2024 - Similarity: 68.1%
POST /api/v1/chat/ask 200 - 187ms ✅
```

### Queries SQL para Monitoramento

**1. Verificar índice criado:**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'document_embeddings';

-- Deve mostrar: document_embeddings_embedding_hnsw_idx
```

**2. Verificar tamanho do índice:**
```sql
SELECT 
  pg_size_pretty(pg_relation_size('document_embeddings_embedding_hnsw_idx')) as index_size
FROM pg_class 
WHERE relname = 'document_embeddings_embedding_hnsw_idx';

-- Esperado: 150-300 MB para 100k embeddings
```

**3. Testar performance de busca:**
```sql
EXPLAIN ANALYZE
SELECT * FROM document_embeddings
WHERE 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) > 0.5
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Planning Time: ~1ms
-- Execution Time: ~50-200ms (com índice) vs 8000ms (sem índice)
```

## ⚠️ Troubleshooting

### Problema: Script SQL não executa
**Erro:** `permission denied for database postgres`

**Solução:**
```sql
-- Execute como superuser ou use seu banco específico:
ALTER DATABASE [seu_banco] SET statement_timeout = '30s';
```

### Problema: Índice demora muito
**Sintoma:** Mais de 30 minutos criando índice

**Causas possíveis:**
- Plano Supabase gratuito com CPU limitada
- Mais de 200k embeddings

**Soluções:**
1. Aguarde mais tempo (pode levar 1-2 horas)
2. Considere IVFFlat para bases maiores:
```sql
CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Problema: Ainda dando timeout após índice
**Sintoma:** Timeout mesmo com índice criado

**Verificações:**
1. Índice foi criado? `\di+ document_embeddings_embedding_hnsw_idx`
2. Estatísticas atualizadas? `ANALYZE document_embeddings;`
3. Query está usando índice? `EXPLAIN ANALYZE ...`

**Soluções:**
```sql
-- Aumentar work_mem para queries complexas
SET work_mem = '256MB';

-- Aumentar statement_timeout ainda mais
SET statement_timeout = '60s';

-- Forçar uso do índice
SET enable_seqscan = OFF;
```

## 📈 Métricas de Performance

### Antes da Otimização
- Tempo de busca: **8,000-9,000ms**
- Taxa de sucesso: **0%** (timeout)
- Chunks retornados: **0**
- Custo OpenAI: **$0.000002** (embedding apenas)

### Depois da Otimização (esperado)
- Tempo de busca: **50-200ms**
- Taxa de sucesso: **100%**
- Chunks retornados: **5-10**
- Custo OpenAI: **$0.001-0.003** (embedding + geração)

### ROI (Return on Investment)
- **40-160x mais rápido**
- **UX drasticamente melhorada**
- **Custo de storage:** +30% (índice)
- **Build time:** 10-15 min (one-time)

## 📚 Referências

- [pgvector HNSW](https://github.com/pgvector/pgvector#hnsw)
- [Supabase Vector Search](https://supabase.com/docs/guides/ai/vector-indexes)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## ✅ Checklist de Conclusão

- [ ] Script SQL executado no Supabase
- [ ] Índice HNSW criado com sucesso
- [ ] Backend reiniciado
- [ ] Teste de busca realizado
- [ ] Performance 50-200ms confirmada
- [ ] Zero timeouts nas últimas 10 buscas

---

**Status:** ⏳ Aguardando execução do script SQL no Supabase

**Próximo passo:** Execute `fix-vector-search-performance.sql` no SQL Editor
