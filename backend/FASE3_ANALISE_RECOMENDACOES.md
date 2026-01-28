# 🎯 FASE 3 - Análise Técnica e Recomendações

## 📊 Análise da Arquitetura Atual

### Estrutura do Sistema (Fases 1-2 Completas)

**FASE 1 - Base de Conhecimento:**
- ✅ Gestão de documentos institucionais
- ✅ Versionamento e preparação automática
- ✅ Extração de texto (PDF, DOCX, TXT)
- ✅ Chunking inteligente (~500 chars)
- ✅ 4 tipos de documentos: REGIMENTO, PPP, CALENDARIO, ATA, CIRCULAR, OUTRO

**FASE 2 - Indexação Vetorial (RAG):**
- ✅ Embeddings com OpenAI (text-embedding-3-large, 1536 dim)
- ✅ Busca semântica com pgvector + HNSW
- ✅ Threshold dinâmico (queries curtas ≠ longas)
- ✅ Re-ranking inteligente (similaridade + tipo doc + recência)
- ✅ Governança por perfil (DIRETOR, COMISSAO, TI)
- ✅ Custo: ~$0,10/mês (100 docs + 1000 buscas)

**Arquitetura de Governança:**
```
┌─────────────────────────────────────────────────────────┐
│ PERFIS DE USUÁRIO                                       │
├─────────────────────────────────────────────────────────┤
│ TI               → Acesso total (manutenção)            │
│ COMISSAO         → Todas as unidades (fiscalização)     │
│ DIRETOR          → Apenas sua unidade (gestão local)    │
│ COORDENACAO      → Pedagógico da sua unidade            │
│ SECRETARIA       → Acesso total (gestão municipal)      │
└─────────────────────────────────────────────────────────┘
```

**Infraestrutura:**
- Backend: Node.js + TypeScript + Express
- Banco: Supabase (PostgreSQL + pgvector)
- Auth: Supabase Auth (JWT)
- Storage: Supabase Storage
- IA: OpenAI API

---

## 🔑 RECOMENDAÇÕES PARA FASE 3

Baseado na análise da arquitetura, estrutura de dados, governança implementada e padrões de uso esperados:

### 1️⃣ ARQUITETURA DO CHAT

**Recomendação: ( X ) Stateless (recomendado para v1)**

**Justificativa:**

✅ **Vantagens do Stateless:**
- **Simplicidade:** Cada pergunta é independente, sem gerenciar sessões
- **Escalabilidade:** Sem estado = sem problemas de concorrência
- **Custo previsível:** 1 pergunta = 1 request OpenAI
- **Governança mais fácil:** Filtros aplicados por request
- **Debugging simples:** Cada request é isolado
- **Rápido para MVP:** Menor complexidade de implementação

❌ **Desvantagens do Stateful (para v1):**
- Complexidade de gerenciar histórico de conversas
- Custo crescente (cada resposta inclui histórico completo)
- Necessita tabela `conversations` e `conversation_messages`
- Token limit de 128k pode ser atingido em conversas longas
- Governança mais complexa (e se o usuário mudar de perfil?)

**Migração futura:** Stateless → Stateful é simples quando necessário.

---

### 2️⃣ FORMATO DA RESPOSTA

**Recomendação: ( X ) Citar documentos explicitamente**

**Justificativa:**

✅ **Por que citar é essencial:**
- **Confiabilidade:** Usuários confiam mais com fontes citadas
- **Auditoria:** Rastreabilidade de onde veio cada informação
- **Governança:** Mostra que filtros estão funcionando
- **Transparência:** Usuário vê que a resposta vem de documentos reais
- **Validação:** Usuário pode verificar a fonte original
- **Legal/Compliance:** Importante para documentos normativos

**Formato sugerido:**
```
Resposta: De acordo com o Regimento Escolar 2026, a matrícula 
deve ser realizada entre 15 e 30 de janeiro.

Fontes consultadas:
📄 Regimento Escolar 2026 (Documento Normativo)
📄 Calendário Letivo 2026 (página 3)
```

**Implementação:** Já temos `SearchResultChunk` com metadata completa!

---

### 3️⃣ MODELO DE LLM

**Recomendação: ( X ) gpt-4o-mini (custo mínimo)**

**Justificativa:**

✅ **Por que gpt-4o-mini é adequado para v1:**

**Qualidade suficiente:**
- Reformulação de texto: ✅ Excelente
- Síntese de documentos: ✅ Muito bom
- Respostas curtas: ✅ Perfeito
- Português: ✅ Nativo

**Custo controlado:**
- Input: $0.15 / 1M tokens (vs $2.50 do gpt-4o)
- Output: $0.60 / 1M tokens (vs $10.00 do gpt-4o)
- **16x mais barato** que gpt-4o!

**Cenário realista:**
```
1 chat = 2.000 tokens input (prompt + contexto RAG)
       + 500 tokens output (resposta)
       
Custo por chat:
- gpt-4o-mini: $0.0006 (0,06 centavos)
- gpt-4o:      $0.0100 (1 centavo)

1.000 chats/mês:
- gpt-4o-mini: $0,60
- gpt-4o:      $10,00
```

**Quando migrar para gpt-4o:**
- Reasoning complexo (raciocínio lógico multi-etapas)
- Análises profundas de políticas públicas
- Comparação de múltiplos documentos normativos
- Geração de relatórios executivos complexos

**Estratégia híbrida futura:**
- 95% das perguntas: gpt-4o-mini (rápido e barato)
- 5% complexas: gpt-4o (sob demanda)

---

### 4️⃣ CONTROLE DE ACESSO AO CHAT

**Recomendação: ( X ) Diretor+ (Diretor, Comissão, Secretaria, TI)**

**Justificativa:**

✅ **Por que Diretor+ é ideal:**

**Alinhado com governança atual:**
- Sistema já tem filtros por perfil implementados
- Diretores têm necessidade real de consulta rápida
- Comissão precisa para fiscalização
- TI para suporte e testes

**Excluindo perfis inicialmente:**
- **Coordenação Pedagógica:** Pode usar em v2 após validação
- **Público geral:** Não (documentos podem ser sensíveis)

**Piloto estruturado:**
```
FASE 3.1 (Piloto):
  → TI + Comissão (2-4 semanas)
  → Ajustes e validação

FASE 3.2 (Expansão):
  → Diretor + Secretaria (1-2 meses)
  → Monitoramento de uso

FASE 3.3 (Completo):
  → Coordenação Pedagógica
  → Outros perfis conforme demanda
```

**Vantagens do piloto controlado:**
- Detectar problemas antes da expansão
- Ajustar prompts baseado em uso real
- Controlar custos iniciais
- Coletar feedback qualificado

---

## 📋 RESUMO DAS RECOMENDAÇÕES

| Aspecto | Recomendação | Motivação Principal |
|---------|--------------|---------------------|
| **Arquitetura** | ✅ Stateless | Simplicidade + MVP rápido |
| **Citações** | ✅ Explícitas | Confiança + Auditoria |
| **Modelo LLM** | ✅ gpt-4o-mini | Custo 16x menor + Qualidade adequada |
| **Acesso** | ✅ Diretor+ (piloto) | Validação controlada |

---

## 💰 ESTIMATIVA DE CUSTO (FASE 3)

### Cenário: 100 usuários ativos

**Uso estimado:**
- 50 diretores: 20 chats/mês cada = 1.000 chats
- 10 comissão: 50 chats/mês cada = 500 chats
- 5 secretaria: 100 chats/mês cada = 500 chats
- 2 TI: 50 chats/mês cada = 100 chats
- **Total: 2.100 chats/mês**

**Cálculo de custo:**

**Opção A: gpt-4o-mini (recomendado)**
```
Embedding (busca RAG):
  2.100 queries × $0.000002 = $0,004

LLM (geração de resposta):
  2.100 chats × $0,0006 = $1,26

Total: $1,26/mês (R$ 6,30 com dólar a R$ 5,00)
```

**Opção B: gpt-4o (qualidade máxima)**
```
Embedding (busca RAG):
  2.100 queries × $0.000002 = $0,004

LLM (geração de resposta):
  2.100 chats × $0,010 = $21,00

Total: $21,00/mês (R$ 105,00 com dólar a R$ 5,00)
```

**Diferença:** **R$ 98,70/mês** economizados com gpt-4o-mini!

---

## 🏗️ ESTRUTURA TÉCNICA SUGERIDA

### Novo Service: chat.service.ts

```typescript
interface ChatRequest {
  user_id: string;
  user_profile: 'DIRETOR' | 'COMISSAO' | 'TI' | 'SECRETARIA';
  unit_id?: string;
  query: string;
}

interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  tokens_used: number;
  cost: number;
  model: string;
}

interface ChatSource {
  document_id: string;
  document_name: string;
  document_type: string;
  chunk_content: string;
  similarity: number;
}
```

### Fluxo do Chat:

```
1. Receber pergunta do usuário
   ↓
2. Buscar chunks relevantes (search.service.ts)
   - Governança automática por perfil
   - Top 5-8 chunks mais similares
   ↓
3. Montar prompt para LLM:
   - System: "Você é assistente institucional..."
   - Context: Chunks encontrados
   - Question: Pergunta do usuário
   - Instructions: "Cite as fontes..."
   ↓
4. Chamar OpenAI (gpt-4o-mini)
   ↓
5. Formatar resposta com citações
   ↓
6. Salvar log de auditoria
   ↓
7. Retornar resposta ao usuário
```

---

## 🎯 ROADMAP FASE 3

### Sprint 1: Setup Inicial (1 semana)
- [ ] Criar `chat.service.ts`
- [ ] Integrar com `search.service.ts` (reuso!)
- [ ] Criar rota `POST /api/chat`
- [ ] Testes com gpt-4o-mini
- [ ] Logging de custos

### Sprint 2: Prompt Engineering (1 semana)
- [ ] Desenvolver system prompt
- [ ] Testar diferentes formatos de citação
- [ ] Validar governança no contexto
- [ ] Ajustar temperatura e top_p

### Sprint 3: Piloto TI + Comissão (2 semanas)
- [ ] Deploy para 2-4 usuários
- [ ] Monitorar custos diários
- [ ] Coletar feedback qualitativo
- [ ] Ajustar prompts baseado em uso real

### Sprint 4: Expansão Diretores (2 semanas)
- [ ] Liberar para 10-20 diretores
- [ ] Treinamento básico
- [ ] Documentação de uso
- [ ] Monitoramento de qualidade

### Sprint 5: Produção Completa (1 semana)
- [ ] Liberar para todos os perfis permitidos
- [ ] Dashboard de métricas
- [ ] Alertas de custo
- [ ] Documentação final

**Total: 7 semanas (1,5 meses)**

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Custo além do esperado
**Mitigação:**
- Alertas automáticos (ex: > $5/dia)
- Rate limiting por usuário (ex: 20 chats/dia)
- Dashboard de monitoramento em tempo real

### Risco 2: Respostas incorretas
**Mitigação:**
- Sempre citar fontes (usuário pode verificar)
- Prompt com instrução: "Se não encontrar nos documentos, diga 'Não encontrei informações sobre isso nos documentos disponíveis'"
- Feedback negativo registrado para análise

### Risco 3: Vazamento de informações
**Mitigação:**
- Governança já implementada (herda da busca)
- Logs de auditoria de todas as interações
- System prompt: "Nunca revele informações de outras unidades"

### Risco 4: Abuso do sistema
**Mitigação:**
- Rate limiting (20 chats/usuário/dia)
- Timeout de 30s por request
- Monitoramento de usuários com uso anormal

---

## ✅ CHECKLIST PRÉ-IMPLEMENTAÇÃO

Antes de iniciar a FASE 3, validar:

- [x] FASE 2 completa e testada
- [x] Search service funcionando com governança
- [x] Custos da FASE 2 controlados (< $0,10/mês)
- [x] Documentos indexados e atualizados
- [ ] OpenAI API key com créditos suficientes
- [ ] Aprovação de orçamento para custos de LLM
- [ ] Definição de perfis do piloto
- [ ] Plano de comunicação com usuários

---

## 🎉 CONCLUSÃO

**Configuração recomendada para FASE 3:**

```
✅ Stateless (v1)
✅ Citações explícitas
✅ gpt-4o-mini
✅ Diretor+ (piloto controlado)
```

**Custo estimado:** R$ 6,30/mês (2.100 chats)

**Tempo de implementação:** 7 semanas

**Risco:** Baixo (arquitetura já validada na FASE 2)

**Próximo passo:** Aprovação para iniciar desenvolvimento da FASE 3 com as configurações recomendadas.
