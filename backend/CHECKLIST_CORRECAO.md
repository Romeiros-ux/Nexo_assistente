# ✅ CHECKLIST DE CORREÇÃO

## 📋 Status do Sistema

### ✅ CONCLUÍDO (O que já funciona)
- [x] Taxonomia de domínios definida
- [x] 1.000 documentos carregados no banco
- [x] 18 arquivos Excel processados  
- [x] Coluna `domain` criada
- [x] Coluna `subdomain` criada
- [x] Coluna `metadata_year` criada
- [x] Coluna `education_stage` criada
- [x] Coluna `keywords` criada
- [x] Documentos classificados automaticamente
- [x] Serviço de classificação (LLM) funcionando
- [x] Chat service atualizado
- [x] Código TypeScript correto
- [x] **Função SQL criada no projeto** ✅

### ❌ PENDENTE (O que precisa fazer AGORA)
- [ ] **Executar SQL no Supabase** 🔴 BLOCKER
- [ ] Reiniciar backend
- [ ] Testar query IDEB novamente
- [ ] Validar que retorna apenas Excel
- [ ] Confirmar tempo de resposta < 1s

---

## 🚀 AÇÃO IMEDIATA

### 1️⃣ Abrir Supabase (2 min)

**Link:** https://supabase.com  
**Projeto:** edu-ia-assistente  
**Ir para:** SQL Editor (menu lateral)

### 2️⃣ Executar SQL (1 min)

**Arquivo:** `backend/migrations/create-match-chunks-by-domain.sql`

**Passos:**
1. Clique em: **+ New Query**
2. Copie TODO o conteúdo do arquivo (142 linhas)
3. Cole no editor
4. Clique em: **▶️ RUN**

**Resultado esperado:**
```
✅ Success. No rows returned
```

### 3️⃣ Verificar Instalação (30 seg)

No terminal do backend:
```bash
npx tsx scripts/verificar-funcao-sql.ts
```

**Saída esperada:**
```
✅ Função existe e funciona!
📊 Resultados encontrados: 3

Top 3 documentos:
   1. ideb_territorios-3305505-2023-AF.xlsx
      Tipo: REPORT
      Domínio: INDICADORES_EDUCACIONAIS > IDEB
```

### 4️⃣ Reiniciar Backend (10 seg)

```bash
# Parar (Ctrl+C)
# Iniciar
npm run dev
```

### 5️⃣ Testar no Frontend (1 min)

**Query:** "Qual etapa está com a pior nota do ideb em 2023?"

**Resultado esperado:**
- ✅ Apenas arquivos Excel (tipo: REPORT)
- ✅ Apenas dados de IDEB
- ✅ Apenas ano 2023
- ❌ SEM leis ou planos municipais

---

## 🎯 Critérios de Sucesso

### ✅ Sistema Funcionando Corretamente

Marque cada item após testar:

**Teste 1: IDEB**
- [ ] Query: "Qual é o IDEB de Saquarema em 2023?"
- [ ] Retorna: Apenas arquivos Excel IDEB
- [ ] Tempo: < 1 segundo
- [ ] Sem erros nos logs

**Teste 2: Taxa de Aprovação**
- [ ] Query: "Qual é a taxa de aprovação em 2023?"
- [ ] Retorna: Apenas arquivos Excel de rendimento
- [ ] Tempo: < 1 segundo
- [ ] Sem erros nos logs

**Teste 3: Legislação**
- [ ] Query: "Quais são as leis sobre educação?"
- [ ] Retorna: Apenas PDFs de legislação
- [ ] Tempo: < 1 segundo
- [ ] Sem erros nos logs

### ✅ Logs Corretos

Deve aparecer nos logs do backend:
```
[SearchService] ✅ Query classificada:
{
  domain: 'INDICADORES_EDUCACIONAIS',
  subdomain: 'IDEB',
  confidence: 0.98
}

[SearchService] 📊 Busca especializada retornou 3 resultados

Top documentos após re-ranking:
  1. ideb_territorios-3305505-2023-AF.xlsx ✅
  2. ideb_territorios-3305505-2023-AI.xlsx ✅
  3. ideb_territorios-3305505-2023-EM.xlsx ✅
```

**NÃO deve aparecer:**
```
❌ Erro na busca por domínio: operator does not exist
❌ Caindo no fallback da busca antiga
❌ plano-municipal-de-educacao (LAW)
❌ LO-1053-2010 (LAW)
```

---

## 🐛 Troubleshooting

### Problema: Função ainda não existe
**Sintoma:**
```
Error: function match_chunks_by_domain does not exist
```
**Solução:**
1. Verifique se executou o SQL no Supabase (não no terminal local)
2. Confirme que clicou em RUN
3. Verifique se não há erros na criação

### Problema: Retorna 0 resultados
**Sintoma:**
```
Busca especializada retornou 0 resultados
```
**Solução:**
```bash
# Verificar documentos IDEB
npx tsx scripts/check-ideb-documents.ts

# Se não houver, classificar novamente
npx tsx scripts/classify-excel-documents.ts
```

### Problema: Ainda retorna documentos errados
**Sintoma:**
```
Retorna: plano-municipal-de-educacao (LAW)
```
**Solução:**
1. Verifique se reiniciou o backend após SQL
2. Confirme que a função foi criada corretamente
3. Teste com script de verificação

---

## 📊 Comparação: ANTES vs DEPOIS

### ANTES da Correção ❌
```
Query: IDEB 2023

Sistema classifica: ✅ INDICADORES_EDUCACIONAIS/IDEB
Sistema busca: ❌ Função não existe
Sistema retorna: ❌ Qualquer documento (LEI, MANUAL, REPORT)

Resultado:
  1. plano-municipal (LAW) ❌
  2. lei-organica (LAW) ❌
  3. manual-educacao (MANUAL) ❌
```

### DEPOIS da Correção ✅
```
Query: IDEB 2023

Sistema classifica: ✅ INDICADORES_EDUCACIONAIS/IDEB
Sistema busca: ✅ Função filtra por domínio
Sistema retorna: ✅ Apenas REPORT do domínio correto

Resultado:
  1. ideb_territorios-2023-AF.xlsx ✅
  2. ideb_territorios-2023-AI.xlsx ✅
  3. ideb_territorios-2023-EM.xlsx ✅
```

---

## 📞 Próximos Passos

Depois que tudo estiver funcionando:

1. [ ] Marcar issue como resolvida
2. [ ] Atualizar documentação
3. [ ] Criar backup da migration
4. [ ] Testar com mais queries
5. [ ] Validar performance
6. [ ] Monitorar logs por 24h

---

**Tempo total estimado:** 5 minutos  
**Dificuldade:** ⭐ Fácil (apenas copiar/colar SQL)  
**Impacto:** 🎯🎯🎯 CRÍTICO (sistema não funciona sem isso)

---

## ✅ Confirmação Final

Após executar todos os passos, você deve poder responder SIM para:

- [ ] Executei o SQL no Supabase?
- [ ] Recebi mensagem de sucesso?
- [ ] Script de verificação passou?
- [ ] Reiniciei o backend?
- [ ] Query IDEB retorna apenas Excel?
- [ ] Tempo de resposta < 1 segundo?
- [ ] Sem erros nos logs?

Se todas as respostas forem SIM: **Sistema está funcionando! 🎉**
