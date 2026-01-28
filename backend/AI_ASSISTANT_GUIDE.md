# 🤖 Guia do Assistente Institucional Inteligente

## 📋 Visão Geral

Sistema de prompts especializado para gestão educacional pública, integrado com governança de acesso baseada em unidades educacionais.

---

## 🧩 Arquitetura do Sistema

### Componentes Principais

```
src/ai/
├── system-prompt.ts           # Comportamento base do assistente
├── profile-prompt.ts          # Governança por perfil (PRIMEIRO)
├── functional-prompts.ts      # Prompts especializados por tipo
├── context-builder.ts         # Construção de contexto do usuário
├── prompt-orchestrator.ts     # Orquestração e composição
├── examples/                  # Exemplos de respostas
│   ├── urgency-example.md
│   ├── consultation-example.md
│   └── profile-example.md
└── index.ts                   # Exports
```

### Hierarquia de Prompts

```
1. System Prompt (comportamento institucional geral)
   ↓
2. Profile Prompt (governança baseada no perfil)
   ↓
3. User Context (unidades vinculadas + histórico)
   ↓
4. Functional Prompt (analytical, urgency, etc.)
   ↓
5. User Query (pergunta do usuário)
```

---

## 🎭 Tipos de Prompt

### 1. **Analytical** (Análise de Dados)

**Quando usar:**
- Análise de indicadores educacionais
- Comparação de desempenho
- Diagnósticos baseados em dados

**Keywords detectadas:**
- analise, análise, indicador, dados, estatística
- comparar, avaliar, diagnostico, diagnóstico
- resultado, desempenho, índice, taxa, percentual

**Estrutura da resposta:**
```
## 📋 Contextualização
## 📊 Leitura dos Dados
## 🔎 Interpretação Técnica
## ⚠️ Pontos de Atenção
## 📝 Síntese Executiva
```

---

### 2. **Action Plan** (Plano de Ação)

**Quando usar:**
- Criação de estratégias
- Resolução de problemas
- Implementação de melhorias

**Keywords detectadas:**
- plano, ação, estratégia, como fazer, implementar
- resolver, melhorar, solução, proposta, projeto

**Estrutura da resposta:**
```
## 🎯 Objetivo do Plano
## 📌 Diagnóstico de Origem
## 🧭 Estratégias Propostas
## 📅 Plano de Execução (tabela)
## 📈 Indicadores de Monitoramento
## ⚠️ Riscos e Mitigações
```

---

### 3. **Urgency** (Situações Críticas)

**Quando usar:**
- Identificação de carências
- Situações de risco
- Alertas críticos

**Keywords detectadas:**
- urgente, urgência, crítico, crítica, problema
- carência, falta, risco, alerta, atenção

**Estrutura da resposta:**
```
## 🚨 Situação Identificada
## 🏫 Unidades Impactadas
## 🔥 Grau de Criticidade (Baixo/Médio/Alto/Crítico)
## 🧩 Impactos Potenciais
## 🛠️ Recomendações Imediatas
## 📞 Encaminhamentos Sugeridos
```

---

### 4. **Consultation** (Consulta Documental)

**Quando usar:**
- Consulta a documentos institucionais
- Verificação de normas internas
- Busca por diretrizes oficiais
- Rastreamento de informações normativas

**Keywords detectadas:**
- lei, norma, regra, legislação, documento
- portaria, resolução, decreto, diretriz
- o que diz, qual é a regra, onde consta

**Estrutura da resposta:**
```
## 📄 Consulta Documental
### 🔍 Pergunta
### 📌 Informações Localizadas (ou declaração de ausência)
### 🗂️ Fonte(s) Consultada(s) (com seção/artigo)
### 🧾 Observação Institucional
```

**Características especiais:**
- Rastreabilidade obrigatória (documento + seção)
- Transcrição fiel ou paráfrase literal
- Sem interpretações além do texto
- Declaração explícita se não encontrar
- Sem uso de conhecimento externo

---

### 5. **General** (Orientação Geral)

**Quando usar:**
- Dúvidas gerais
- Orientações institucionais
- Questões não classificadas

**Keywords detectadas:**
- como, o que é, explique, orientação, ajuda

**Estrutura da resposta:**
```
## 📋 Contexto da Questão
## 💡 Orientação
## 📚 Informações Complementares
## 🔗 Próximos Passos
```

---

## 🔐 Governança de Acesso

### Regras de Filtragem

O assistente respeita automaticamente a governança implementada:

| Perfil | Acesso | Comportamento do Assistente |
|--------|--------|----------------------------|
| **TI** | Global | Pode analisar todas as unidades |
| **Outros** | Apenas unidades vinculadas | Limita respostas ao escopo autorizado |

### Contexto Injetado Automaticamente

```typescript
// Exemplo de contexto para usuário Diretor
🔐 CONTEXTO DE ACESSO DO USUÁRIO

Perfil: Diretor
Escopo de Acesso: RESTRITO às seguintes unidades educacionais:

- Escola Municipal João Silva (school)
- Centro de Educação Infantil (center)

Total de unidades vinculadas: 2

IMPORTANTE: 
- Você DEVE limitar TODAS as análises APENAS a estas unidades
- NÃO forneça dados de outras unidades
```

---

## 🚀 Como Usar

### 1. Importar Módulos

```typescript
import {
  orchestratePrompt,
  UserContext,
  PromptType,
} from '@/ai';
```

### 2. Construir Contexto do Usuário

```typescript
const userContext: UserContext = {
  userId: 'user-uuid',
  name: 'João Silva',
  email: 'joao@escola.com',
  role: 'Diretor',
  units: [
    { id: 'unit-1', name: 'Escola A', type: 'school', ... },
    { id: 'unit-2', name: 'Escola B', type: 'school', ... }
  ],
  hasGlobalAccess: false,
};
```

### 3. Orquestrar Prompt

```typescript
const userQuery = 'Analise o desempenho dos alunos da Escola A';

const orchestrated = orchestratePrompt(
  userQuery,
  userContext,
  conversationHistory // opcional
);

console.log('Tipo detectado:', orchestrated.detectedType);
// Output: 'analytical'

console.log('Prompt completo:', orchestrated.fullPrompt);
// Prompt pronto para enviar ao LLM
```

### 4. Enviar ao LLM

```typescript
// Exemplo com OpenAI
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: orchestrated.fullPrompt,
    },
    {
      role: 'user',
      content: userQuery,
    },
  ],
});

const assistantResponse = response.choices[0].message.content;
```

### 5. Validar Resposta

```typescript
import { validateResponse } from '@/ai';

const validation = validateResponse(
  assistantResponse,
  orchestrated.detectedType
);

if (!validation.isValid) {
  console.error('Issues:', validation.issues);
}
```

---

## 🧪 Exemplos Práticos

### Exemplo 1: Análise de Dados

**Query do usuário:**
```
"Analise os indicadores de frequência escolar nas minhas unidades"
```

**Tipo detectado:** `analytical`

**Resposta esperada:**
```markdown
## 📋 Contextualização
Análise da frequência escolar nas 2 unidades vinculadas ao usuário (Escola A e Escola B).

## 📊 Leitura dos Dados
Com base nas informações atualmente disponíveis no sistema, não foi possível localizar dados de frequência escolar para o período solicitado.

Para realizar esta análise, são necessários:
- Registros de presença por unidade
- Período de referência
- Segmentação por série/turma (opcional)

## 📝 Síntese Executiva
Não há dados suficientes para análise no momento. Solicite ao setor de gestão escolar a disponibilização dos registros de frequência.
```

---

### Exemplo 2: Plano de Ação

**Query do usuário:**
```
"Como posso melhorar a alfabetização nos anos iniciais?"
```

**Tipo detectado:** `action-plan`

**Resposta esperada:**
```markdown
## 🎯 Objetivo do Plano
Elevar os índices de alfabetização nos anos iniciais (1º ao 3º ano) nas unidades sob gestão.

## 📌 Diagnóstico de Origem
- Taxa de alfabetização abaixo da meta municipal
- Necessidade de formação continuada de professores
- Falta de material didático específico

## 🧭 Estratégias Propostas
1. Formação de professores em metodologias ativas de alfabetização
2. Implementação de avaliações diagnósticas trimestrais
3. Criação de grupos de reforço para alunos com dificuldade

## 📅 Plano de Execução
| Ação | Responsável Sugerido | Prazo | Indicador |
|------|---------------------|-------|-----------|
| Diagnóstico inicial | Coordenação Pedagógica | 30 dias | % de alunos alfabetizados |
| Formação docente | Secretaria de Educação | 60 dias | Nº de professores capacitados |
| Grupos de reforço | Diretor + Coordenação | 90 dias | Evolução dos alunos atendidos |

## 📈 Indicadores de Monitoramento
- Taxa de alfabetização (medida trimestralmente)
- Frequência dos alunos nos grupos de reforço
- Avaliação de satisfação dos professores com a formação

## ⚠️ Riscos e Mitigações
Risco: Resistência dos professores à nova metodologia
Mitigação: Implementação gradual com acompanhamento próximo
```

---

### Exemplo 3: Situação Urgente

**Query do usuário:**
```
"A Escola A está sem merenda há 3 dias"
```

**Tipo detectado:** `urgency`

**Resposta esperada:**
```markdown
## 🚨 Situação Identificada
Interrupção no fornecimento de merenda escolar na Escola A há 3 dias.

## 🏫 Unidades Impactadas
- Escola Municipal João Silva (Escola A)
- Estimativa: 450 alunos afetados

## 🔥 Grau de Criticidade
CRÍTICO

Justificativa:
- A merenda é direito constitucional do aluno
- Impacto direto na nutrição e permanência escolar
- Possível descumprimento do PNAE (Programa Nacional de Alimentação Escolar)

## 🧩 Impactos Potenciais
- Evasão escolar temporária
- Desnutrição de alunos em situação de vulnerabilidade
- Responsabilização legal da gestão
- Danos à imagem institucional

## 🛠️ Recomendações Imediatas
1. Acionar URGENTEMENTE a Secretaria de Educação
2. Verificar status do contrato com fornecedor
3. Implementar solução emergencial (compra direta, parcerias)
4. Comunicar oficialmente as famílias

## 📞 Encaminhamentos Sugeridos
- Secretaria de Educação (coordenação geral)
- Setor de Compras/Licitações (verificação contratual)
- Conselho Escolar (transparência e apoio)
- Ministério Público (se não resolver em 24h)
```

---

## 🔧 Configurações e Ajustes

### Ajustar Detecção de Tipo

Para melhorar a detecção, edite as keywords em `functional-prompts.ts`:

```typescript
[PromptType.ANALYTICAL]: {
  keywords: [
    'analise', 'análise', 'indicador', 'dados',
    // Adicione novas keywords aqui
  ],
  // ...
}
```

### Personalizar Templates

Edite os templates em `functional-prompts.ts` para ajustar a estrutura das respostas.

### Limitar Histórico de Conversa

```typescript
import { pruneConversationHistory } from '@/ai';

// Mantém apenas últimas 10 mensagens
const cleanHistory = pruneConversationHistory(history, 10);
```

---

## ⚠️ Comportamentos Obrigatórios

### 1. Nunca Inventar Dados

Se não houver dados:
```
"Com base nas informações atualmente disponíveis no sistema, 
não é possível realizar esta análise com precisão."
```

### 2. Respeitar Governança

Se usuário não tem acesso:
```
"Você não possui autorização para acessar dados da Escola X. 
Suas análises estão limitadas às unidades vinculadas ao seu perfil."
```

### 3. Linguagem Técnica e Institucional

- ❌ "Acho que a escola tá bem"
- ✅ "Com base nos indicadores disponíveis, a unidade apresenta desempenho satisfatório"

### 4. Estrutura Clara

Sempre use seções com `##` e organize a informação de forma hierárquica.

---

## 📊 Métricas e Validação

### Validação Automática

O sistema valida se a resposta contém:
- Estrutura de seções (`##`)
- Seções obrigatórias para o tipo detectado
- Ausência de palavras de incerteza ("talvez", "provavelmente")

```typescript
const validation = validateResponse(response, detectedType);

if (!validation.isValid) {
  console.error('Problemas encontrados:', validation.issues);
}
```

---

## 🚀 Integração com Backend

### Endpoint Futuro: POST /chat

```typescript
// Exemplo de controller
async function chatHandler(req: Request, res: Response) {
  const { message } = req.body;
  const user = req.user; // Do authGuard

  // 1. Buscar unidades do usuário
  const units = await unitService.getUserUnits(user.id, user.role);

  // 2. Construir contexto
  const userContext: UserContext = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    units,
    hasGlobalAccess: user.role === UserRole.TI,
  };

  // 3. Orquestrar prompt
  const orchestrated = orchestratePrompt(message, userContext);

  // 4. Enviar ao LLM
  const response = await llmClient.generate(orchestrated.fullPrompt);

  // 5. Validar resposta
  const validation = validateResponse(response, orchestrated.detectedType);

  // 6. Retornar
  res.json({
    success: true,
    data: {
      response,
      detectedType: orchestrated.detectedType,
      validation,
    },
  });
}
```

---

## ✅ Checklist de Implementação

- [x] System prompt definido
- [x] Prompts funcionais criados (5 tipos)
- [x] Detecção automática de tipo
- [x] Context builder com governança
- [x] Orquestrador de prompts
- [x] Validação de respostas
- [x] Documentação completa
- [ ] Endpoint /chat no backend
- [ ] Integração com LLM (OpenAI/Azure/outro)
- [ ] RAG com documentos institucionais
- [ ] Testes automatizados

---

**✅ Sistema de prompts institucional completo e pronto para integração com LLM!**
