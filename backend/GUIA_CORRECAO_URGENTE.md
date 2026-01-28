# 🚨 GUIA DE CORREÇÃO URGENTE - Sistema Retornando Documentos Errados

## 📋 Diagnóstico do Problema

### Situação Atual
```
Query: "Qual etapa está com a pior nota do ideb em 2023?"

✅ Classificação CORRETA:
   Domain: INDICADORES_EDUCACIONAIS
   Subdomain: IDEB
   Confidence: 98%

❌ Documentos Retornados ERRADOS:
   - plano-municipal-de-educacao-saquarema (LAW) ❌
   - LO-1053-2010 (LAW) ❌
   - Plano Municipal De Educao (MANUAL) ❌

✅ Documentos que DEVERIAM ser retornados:
   - ideb_territorios-3305505-2023-AF.xlsx (REPORT) ✅
   - ideb_territorios-3305505-2023-AI.xlsx (REPORT) ✅
   - ideb_territorios-3305505-2023-EM.xlsx (REPORT) ✅
```

### Causa Raiz
```
[SearchService] ⚠️ Erro na busca por domínio: 
operator does not exist: document_type = text
```

**Motivo:** A função SQL `match_chunks_by_domain` **NÃO EXISTE** no Supabase!

O código TypeScript tenta chamar a função, mas ela não existe no banco de dados, então:
1. Retorna erro SQL
2. Sistema cai no fallback (busca antiga sem filtro)
3. Busca antiga retorna documentos de QUALQUER domínio
4. Por isso aparecem leis e manuais ao invés de Excel

---

## 🔧 SOLUÇÃO (5 minutos)

### Passo 1: Abrir Supabase SQL Editor

1. Acesse: https://supabase.com
2. Faça login
3. Selecione o projeto: **edu-ia-assistente**
4. No menu lateral, clique em: **SQL Editor** (ícone de código)

### Passo 2: Executar Migration SQL

1. Clique no botão: **+ New Query**

2. Abra o arquivo local:
   ```
   backend/migrations/create-match-chunks-by-domain.sql
   ```

3. **Copie TODO O CONTEÚDO** do arquivo (142 linhas)

4. **Cole** no SQL Editor do Supabase

5. Clique no botão: **▶️ RUN** (ou Ctrl+Enter)

### Passo 3: Verificar Sucesso

Você deve ver uma mensagem:
```
✅ Success. No rows returned
```

Isso significa que a função foi criada com sucesso!

### Passo 4: Reiniciar Backend

No terminal do backend, pressione:
```bash
Ctrl + C
```

Depois execute novamente:
```bash
npm run dev
```

### Passo 5: Testar Novamente

1. Faça a mesma pergunta no chat:
   ```
   Qual etapa está com a pior nota do ideb em 2023?
   ```

2. **Resultado Esperado:**
   - Deve retornar APENAS arquivos Excel (REPORT)
   - Deve mostrar dados do IDEB 2023
   - NÃO deve retornar leis ou planos municipais

3. **Logs Esperados:**
   ```
   [SearchService] ✅ Query classificada:
   {
     domain: 'INDICADORES_EDUCACIONAIS',
     subdomain: 'IDEB',
     confidence: 0.98
   }
   
   [SearchService] 📊 Busca especializada retornou 3 resultados
   
   Top documentos:
     1. ideb_territorios-3305505-2023-AF.xlsx (REPORT) ✅
     2. ideb_territorios-3305505-2023-AI.xlsx (REPORT) ✅
     3. ideb_territorios-3305505-2023-EM.xlsx (REPORT) ✅
   ```

---

## ✅ Verificação Final

### Teste 1: IDEB
```
Pergunta: "Qual é o IDEB de Saquarema em 2023?"
Esperado: Arquivos Excel com dados do IDEB 2023
```

### Teste 2: Taxa de Aprovação
```
Pergunta: "Qual é a taxa de aprovação em 2023?"
Esperado: Arquivos Excel com dados de rendimento 2023
```

### Teste 3: Legislação
```
Pergunta: "Quais são as leis sobre educação?"
Esperado: Documentos PDF com leis municipais
```

---

## 🎯 O Que Mudou?

### ANTES (Busca Antiga - Sem Filtro):
```sql
SELECT *
FROM document_embeddings
WHERE similarity > 0.7
ORDER BY similarity DESC
LIMIT 10
```
**Problema:** Retorna documentos de QUALQUER tipo (LEI, MANUAL, REPORT)

### DEPOIS (Busca Nova - Com Filtro de Domínio):
```sql
SELECT *
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
WHERE 
  similarity > 0.7
  AND d.domain = 'INDICADORES_EDUCACIONAIS'
  AND d.subdomain = 'IDEB'
  AND d.metadata_year = 2023
ORDER BY similarity DESC
LIMIT 10
```
**Solução:** Filtra documentos ANTES da busca vetorial!

---

## 📊 Métricas de Sucesso

Após a correção, você deve ver:

- ✅ **100% de precisão** nos domínios
  - Perguntas sobre IDEB → Apenas Excel IDEB
  - Perguntas sobre leis → Apenas PDFs de legislação
  - Perguntas sobre taxa → Apenas Excel de rendimento

- ✅ **Tempo de resposta rápido**
  - < 1 segundo para queries simples
  - < 2 segundos para queries complexas

- ✅ **Logs sem erros**
  - Nenhum `operator does not exist`
  - Nenhum fallback para busca antiga

---

## 🐛 Se Ainda Não Funcionar

### Problema 1: Função não foi criada
```
Error: function match_chunks_by_domain does not exist
```
**Solução:** Execute o SQL novamente no Supabase

### Problema 2: Documentos não estão classificados
```
Busca retornou 0 resultados
```
**Solução:**
```bash
cd backend
npx tsx scripts/classify-excel-documents.ts
```

### Problema 3: Documentos não têm embeddings
```
Busca retornou 0 resultados
```
**Solução:** Verifique se os arquivos Excel foram processados corretamente

---

## 📞 Status Esperado

Após executar a migration SQL:

```
✅ Sistema de classificação: FUNCIONANDO (98% confiança)
✅ Função SQL criada: ATIVA
✅ Busca por domínio: FUNCIONANDO
✅ Filtros por ano: FUNCIONANDO
✅ Filtros por etapa: FUNCIONANDO
✅ Retorno de documentos: CORRETO (apenas tipo esperado)
```

---

## 🎉 Próximos Passos (Após Correção)

1. Testar com 5-10 perguntas diferentes
2. Validar performance (< 1s)
3. Confirmar precisão (100% no tipo de documento)
4. Marcar issue como resolvida
5. Atualizar documentação

---

**Tempo estimado:** 5 minutos  
**Prioridade:** 🔴 CRÍTICA  
**Impacto:** 🎯 ALTO (sistema não funciona corretamente sem isso)
