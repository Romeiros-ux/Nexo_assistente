# 🔄 Fluxo de Prompts - Assistente Institucional

## 📋 Ordem Lógica de Uso

O sistema segue uma ordem hierárquica de prompts. Cada tipo tem seu momento ideal de uso.

---

## 🎯 Fluxo Recomendado

### 1️⃣ Análise de Dados (Analytical)

**Quando usar:** Primeiro contato, diagnóstico inicial

**Exemplo de pergunta:**
- "Qual é o desempenho das minhas unidades?"
- "Mostre os indicadores de frequência escolar"
- "Analise os dados de aprovação do último semestre"

**Saída esperada:**
- Indicadores numéricos
- Comparações
- Interpretação técnica
- Síntese executiva

**Próximo passo:**
- Se houver problemas → **Urgency**
- Se precisar agir → **Action Plan**
- Se houver dúvidas → **Consultation**

---

### 2️⃣ Identificação de Carências (Urgency)

**Quando usar:** Após análise revelar problemas

**Exemplo de pergunta:**
- "Quais são as principais carências da Escola A?"
- "Identifique situações urgentes na rede"
- "O que precisa de atenção prioritária?"

**Saída esperada:**
- Lista de carências identificadas
- Classificação (Atenção/Alerta/Urgente)
- Justificativas baseadas em dados
- Síntese técnica
- **SEM SOLUÇÕES**

**Próximo passo:**
- Se houver carência Urgente ou Alerta → **Action Plan**
- Se apenas Atenção → monitoramento contínuo

---

### 3️⃣ Plano de Ação (Action Plan)

**Quando usar:** Após identificar carência que requer intervenção

**Exemplo de pergunta:**
- "Crie um plano de ação para resolver a evasão escolar"
- "Como posso melhorar a infraestrutura da Escola B?"
- "Elabore estratégias para aumentar a aprovação"

**Saída esperada:**
- Objetivo claro
- Diagnóstico de origem
- Estratégias propostas
- Plano de execução (tabela)
- Indicadores de monitoramento
- Riscos e mitigações

**Próximo passo:**
- Implementação externa ao assistente
- Monitoramento via **Analytical**

---

### 4️⃣ Consulta Documental (Consultation)

**Quando usar:** Dúvidas sobre normas, leis, diretrizes, documentos institucionais

**Exemplo de pergunta:**
- "O que diz o regimento sobre merenda escolar?"
- "Qual é o prazo para matrícula conforme a portaria?"
- "Quais são as diretrizes institucionais para alfabetização?"
- "Onde consta a regra sobre afastamento de professores?"

**Saída esperada:**
- Pergunta reformulada
- Informações localizadas (transcrição fiel)
- Fonte(s) consultada(s) (documento + seção/artigo)
- Observação institucional (se houver limitação)
- **SEM INTERPRETAÇÕES ALÉM DO LITERAL**

**Tratamento de ausência:**
- Se não encontrar: declarar explicitamente
- Listar documentos consultados
- Indicar razões da ausência

**Próximo passo:**
- Aplicação prática conforme orientação
- Se necessário → **Action Plan**

---

### 5️⃣ Orientação Geral (General)

**Quando usar:** Dúvidas gerais, esclarecimentos, orientações

**Exemplo de pergunta:**
- "O que é evasão escolar?"
- "Como funciona o sistema de matrículas?"
- "Explique o conceito de gestão democrática"

**Saída esperada:**
- Contexto da questão
- Orientação clara
- Informações complementares
- Próximos passos (se aplicável)

**Próximo passo:**
- Depende da necessidade do usuário

---

## 🔀 Fluxos de Uso Comuns

### Fluxo 1: Diagnóstico Completo

```
Analytical → Urgency → Action Plan
```

**Cenário:**
1. Usuário: "Analise o desempenho da Escola A"
2. Assistente: [Analytical] Mostra indicadores e identifica problemas
3. Usuário: "Quais são as carências?"
4. Assistente: [Urgency] Lista carências e classifica urgência
5. Usuário: "Como resolver a carência urgente?"
6. Assistente: [Action Plan] Cria plano de ação detalhado

---

### Fluxo 2: Consulta + Ação

```
Consultation → Action Plan
```

**Cenário:**
1. Usuário: "O que diz a lei sobre inclusão escolar?"
2. Assistente: [Consultation] Explica legislação
3. Usuário: "Como implementar isso na minha escola?"
4. Assistente: [Action Plan] Cria plano de adequação

---

### Fluxo 3: Urgência Imediata

```
Urgency → Action Plan
```

**Cenário:**
1. Usuário: "A Escola B está sem água há 2 dias"
2. Assistente: [Urgency] Classifica como URGENTE e justifica
3. Usuário: "O que fazer?"
4. Assistente: [Action Plan] Cria plano emergencial

---

### Fluxo 4: Monitoramento Contínuo

```
Analytical → Urgency → Analytical (loop)
```

**Cenário:**
1. Usuário: "Mostre os indicadores mensais"
2. Assistente: [Analytical] Apresenta dados
3. Usuário: "Há algo preocupante?"
4. Assistente: [Urgency] Identifica 2 alertas
5. Próximo mês: repetir para acompanhar evolução

---

## ⚠️ Anti-Padrões (O que EVITAR)

### ❌ Pular etapas

**Errado:**
```
Usuário: "Analise o desempenho"
Assistente: [Action Plan] Já cria plano sem diagnosticar
```

**Correto:**
```
Usuário: "Analise o desempenho"
Assistente: [Analytical] Primeiro mostra dados
```

---

### ❌ Misturar prompts

**Errado:**
```
Assistente: [Urgency] Lista carências E já propõe soluções
```

**Correto:**
```
Assistente: [Urgency] Só lista e classifica
Usuário: "Como resolver?"
Assistente: [Action Plan] Agora propõe soluções
```

---

### ❌ Prompt errado para a situação

**Errado:**
```
Usuário: "O que é IDEB?"
Assistente: [Analytical] Faz análise complexa
```

**Correto:**
```
Usuário: "O que é IDEB?"
Assistente: [General] Explica o conceito
```

---

## 🧠 Lógica de Detecção Automática

O sistema detecta automaticamente o tipo baseado em keywords:

| Tipo | Keywords Principais | Peso |
|------|-------------------|------|
| **Urgency** | urgente, crítico, alerta, carência | ⭐⭐⭐ |
| **Analytical** | analise, indicador, dados, estatística | ⭐⭐ |
| **Action Plan** | plano, estratégia, como fazer, resolver | ⭐⭐ |
| **Consultation** | lei, norma, documento, legislação | ⭐⭐⭐ |
| **General** | o que é, explique, ajuda | ⭐ |

**Regras especiais:**
- "urgente" ou "crítico" → sempre **Urgency** (+3 pontos)
- "plano de ação" → sempre **Action Plan** (+3 pontos)
- "lei" ou "norma" → sempre **Consultation** (+3 pontos)

---

## 🎯 Matriz de Decisão Rápida

| Situação | Prompt Correto |
|----------|---------------|
| Ver números e indicadores | **Analytical** |
| Entender o que está ruim | **Urgency** |
| Resolver um problema | **Action Plan** |
| Consultar regra ou lei | **Consultation** |
| Tirar dúvida básica | **General** |

---

## 📊 Exemplo de Conversa Completa

```
👤 Usuário: "Mostre os indicadores de frequência das minhas escolas"
🤖 Assistente: [ANALYTICAL]

## 📋 Contextualização
Análise de frequência escolar nas 3 unidades vinculadas...

## 📊 Leitura dos Dados
- Escola A: 88% (meta: 90%)
- Escola B: 92% (meta: 90%)
- Escola C: 78% (meta: 90%)

## 🔎 Interpretação Técnica
Escola C apresenta frequência significativamente abaixo...

---

👤 Usuário: "Quais são as carências da Escola C?"
🤖 Assistente: [URGENCY]

## 📌 Escopo da Avaliação
Avaliação de carências na Escola C...

## 📊 Indicadores Observados
| Indicador | Atual | Ref | Situação |
| Frequência | 78% | 90% | Abaixo |
| Evasão | 8% | 3% | Acima |

## 🔍 Carências Identificadas
• Alta taxa de evasão (8% vs 3% tolerável)
• Baixa frequência média (78% vs 90% meta)

## 🚦 Classificação de Urgência
| Carência | Nível | Justificativa |
| Evasão alta | Alerta | Supera limite em 166% |
| Frequência baixa | Alerta | 12pp abaixo da meta |

---

👤 Usuário: "Como posso melhorar a frequência na Escola C?"
🤖 Assistente: [ACTION PLAN]

## 🎯 Objetivo do Plano
Elevar a frequência escolar de 78% para 90% na Escola C...

## 📌 Diagnóstico de Origem
Correlação entre baixa frequência e alta evasão...

## 🧭 Estratégias Propostas
1. Busca ativa de alunos faltosos
2. Programa de incentivo à frequência
3. Parceria com assistência social

## 📅 Plano de Execução
| Ação | Responsável | Prazo | Indicador |
...
```

---

## ✅ Checklist de Implementação

- [x] Detecção automática de tipo implementada
- [x] Prompt de Urgency refinado (sem soluções)
- [x] Documentação de fluxos criada
- [ ] Validação automática de sequência de prompts
- [ ] Sugestão automática de próximo prompt
- [ ] Histórico de conversa com contexto de fluxo

---

**Use este documento como referência para entender quando e como usar cada tipo de prompt.**
