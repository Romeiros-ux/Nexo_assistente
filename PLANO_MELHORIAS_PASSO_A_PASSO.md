# 🚀 Plano de Melhorias - Passo a Passo

**Data:** 15 de Janeiro de 2026  
**Sistema:** Assistente Educacional - Chat RAG  
**Objetivo:** Implementar melhorias sem quebrar fluxo atual

---

## 📋 Melhorias Planejadas

1. ✅ **Metadata Enriquecida** (1-2h) - Ano, etapa e domínio visíveis no prompt
2. ✅ **Histórico de Conversação** (4-6h) - Contexto entre perguntas
3. 🔄 **Cache de Embeddings** (2-3h) - Economia de custos

---

## 🎯 FASE 1: Metadata Enriquecida no Prompt

**Objetivo:** LLM deve ver ano, etapa educacional e categoria de cada chunk

**Tempo estimado:** 1-2 horas  
**Impacto:** Alto (respostas mais precisas)  
**Risco:** Baixo (apenas adiciona informação)

---

### **PASSO 1.1: Modificar `master.prompt.ts` para incluir metadata**

**Arquivo:** `backend/src/prompts/master.prompt.ts`

**Mudança:**
```typescript
// Localizar função buildChatPrompt() - linha ~180
// Modificar o loop que constrói chunksContext

chunks.forEach((chunk, index) => {
  chunksContext += `--- DOCUMENTO ${index + 1} ---\n`;
  chunksContext += `Fonte: ${chunk.source.document_name} (${chunk.source.document_type})\n`;
  
  // ADICIONAR: Metadata enriquecida
  if (chunk.metadata?.year) {
    chunksContext += `📅 Ano: ${chunk.metadata.year}\n`;
  }
  if (chunk.metadata?.education_stage) {
    const stageLabels: Record<string, string> = {
      'AI': 'Anos Iniciais (1º-5º ano)',
      'AF': 'Anos Finais (6º-9º ano)',
      'EM': 'Ensino Médio',
      'EI': 'Educação Infantil'
    };
    const stageLabel = stageLabels[chunk.metadata.education_stage] || chunk.metadata.education_stage;
    chunksContext += `🎓 Etapa: ${stageLabel}\n`;
  }
  if (chunk.metadata?.subdomain) {
    chunksContext += `📊 Categoria: ${chunk.metadata.subdomain}\n`;
  }
  
  chunksContext += `🎯 Relevância: ${(chunk.similarity * 100).toFixed(1)}%\n`;
  chunksContext += `\nConteúdo:\n${chunk.content}\n\n`;
});
```

**Ações:**
```powershell
# 1. Abrir arquivo
code backend/src/prompts/master.prompt.ts

# 2. Fazer modificação conforme acima (linhas 180-200 aprox)

# 3. Salvar arquivo
```

**✅ CHECKPOINT 1.1:**
```powershell
# Verificar sintaxe TypeScript
cd backend
npx tsc --noEmit

# Deve retornar sem erros
```

**❌ Se houver erro:**
- Verificar chaves `{}` e parênteses `()`
- Verificar vírgulas e ponto-e-vírgulas
- Reverter mudança com Ctrl+Z

---

### **PASSO 1.2: Atualizar interface `ChatContext`**

**Arquivo:** `backend/src/prompts/master.prompt.ts`

**Mudança:**
```typescript
// Localizar interface ChatContext - linha ~175
export interface ChatContext {
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_name?: string;
  query: string;
  chunks: Array<{
    content: string;
    source: {
      document_name: string;
      document_type: string;
    };
    similarity: number;
    metadata?: {  // ADICIONAR este bloco
      year?: number;
      education_stage?: string;
      domain?: string;
      subdomain?: string;
    };
  }>;
}
```

**✅ CHECKPOINT 1.2:**
```powershell
npx tsc --noEmit
# Deve compilar sem erros
```

---

### **PASSO 1.3: Garantir que `chat.service.ts` passa metadata**

**Arquivo:** `backend/src/services/chat.service.ts`

**Verificação:**
```typescript
// Localizar onde monta o contexto - linha ~153-170
const context: ChatContext = {
  user_profile: request.user_profile,
  unit_name: request.unit_name,
  query: request.query,
  chunks: searchResult.results.map((chunk: SearchResultChunk) => ({
    content: chunk.content,
    source: {
      document_name: chunk.source.document_name,
      document_type: chunk.source.document_type,
    },
    similarity: chunk.similarity,
    metadata: chunk.metadata,  // ✅ VERIFICAR: Esta linha já existe?
  })),
};
```

**Ações:**
```powershell
# 1. Abrir arquivo
code backend/src/services/chat.service.ts

# 2. Localizar linha ~160 (mapeamento de chunks)

# 3. VERIFICAR se já inclui `metadata: chunk.metadata`
#    - Se SIM: ✅ Nada a fazer
#    - Se NÃO: Adicionar a linha
```

**✅ CHECKPOINT 1.3:**
```powershell
npx tsc --noEmit
# Compilação OK = prosseguir
```

---

### **PASSO 1.4: Criar script de teste para metadata**

**Arquivo:** `backend/scripts/test-metadata-enriched.ts`

```typescript
/**
 * Teste: Verifica se metadata aparece no prompt gerado
 */
import { buildChatPrompt, ChatContext } from '../src/prompts/master.prompt';

const testContext: ChatContext = {
  user_profile: 'TI',
  query: 'Qual o IDEB de 2023?',
  chunks: [
    {
      content: 'O IDEB dos Anos Iniciais em 2023 foi 5.2',
      source: {
        document_name: 'ideb_2023_AI.xlsx',
        document_type: 'REPORT'
      },
      similarity: 0.85,
      metadata: {
        year: 2023,
        education_stage: 'AI',
        subdomain: 'IDEB'
      }
    },
    {
      content: 'O IDEB dos Anos Finais em 2023 foi 4.8',
      source: {
        document_name: 'ideb_2023_AF.xlsx',
        document_type: 'REPORT'
      },
      similarity: 0.82,
      metadata: {
        year: 2023,
        education_stage: 'AF',
        subdomain: 'IDEB'
      }
    }
  ]
};

console.log('🧪 TESTE: Metadata Enriquecida no Prompt\n');
console.log('='.repeat(80));

const prompt = buildChatPrompt(testContext);

console.log(prompt);
console.log('\n' + '='.repeat(80));

// Validações
const checks = [
  { label: '📅 Ano visível', test: prompt.includes('Ano: 2023') },
  { label: '🎓 Etapa AI visível', test: prompt.includes('Anos Iniciais') },
  { label: '🎓 Etapa AF visível', test: prompt.includes('Anos Finais') },
  { label: '📊 Categoria visível', test: prompt.includes('IDEB') },
];

console.log('\n✅ VALIDAÇÕES:\n');
checks.forEach(check => {
  const icon = check.test ? '✅' : '❌';
  console.log(`${icon} ${check.label}`);
});

const allPassed = checks.every(c => c.test);
console.log('\n' + '='.repeat(80));
console.log(allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM!');

process.exit(allPassed ? 0 : 1);
```

**✅ CHECKPOINT 1.4:**
```powershell
# Executar teste
npx tsx scripts/test-metadata-enriched.ts

# Resultado esperado:
# ✅ Ano visível
# ✅ Etapa AI visível
# ✅ Etapa AF visível
# ✅ Categoria visível
# ✅ TODOS OS TESTES PASSARAM!
```

**❌ Se falhar:**
- Revisar mudanças no `master.prompt.ts`
- Verificar emojis e formatação
- Conferir se metadata está sendo passada corretamente

---

### **PASSO 1.5: Testar integração completa com backend**

**Ações:**
```powershell
# 1. Iniciar backend
cd backend
npm run dev

# Aguardar: "✅ Server rodando em http://localhost:3001"
```

**Em outro terminal:**
```powershell
# 2. Testar endpoint real
cd backend

# Criar script de teste rápido
@"
import fetch from 'node-fetch';

async function testChat() {
  // Login
  const login = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@teste.com',
      password: 'Admin@123'
    })
  });
  
  const { data: { token } } = await login.json();
  
  // Pergunta
  const chat = await fetch('http://localhost:3001/api/v1/chat/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: 'Qual o IDEB de 2023 dos anos iniciais?'
    })
  });
  
  const response = await chat.json();
  
  console.log('📊 RESPOSTA:', response.data.answer);
  console.log('\n📚 FONTES:', response.data.sources.length);
  console.log('\n💰 Tokens:', response.data.usage.total_tokens);
}

testChat();
"@ | Out-File -Encoding UTF8 scripts/test-chat-integration.mjs

node scripts/test-chat-integration.mjs
```

**✅ CHECKPOINT 1.5:**
- Backend iniciou sem erros
- Resposta do chat funcionou
- Metadata aparece no log do console backend

**❌ Se houver erro:**
- Verificar logs do backend
- Procurar por erros de sintaxe ou TypeScript
- Reverter mudanças se necessário

---

### **🎉 FASE 1 COMPLETA!**

**Resultado esperado:**
- ✅ LLM agora vê ano, etapa e categoria de cada chunk
- ✅ Respostas mais precisas ("Em 2023, os Anos Iniciais...")
- ✅ Sistema continua funcionando normalmente

**Commit sugerido:**
```bash
git add backend/src/prompts/master.prompt.ts
git add backend/src/services/chat.service.ts
git add backend/scripts/test-metadata-enriched.ts
git commit -m "feat: adiciona metadata enriquecida (ano, etapa, categoria) no prompt do LLM"
```

---

## 🎯 FASE 2: Histórico de Conversação

**Objetivo:** Permitir perguntas de acompanhamento sem repetir contexto

**Tempo estimado:** 4-6 horas  
**Impacto:** Alto (transforma experiência)  
**Risco:** Médio (adiciona tabelas e lógica nova)

---

### **PASSO 2.1: Criar migrations para tabelas de conversação**

**Arquivo:** `backend/migrations/create-conversations-tables.sql`

```sql
-- =============================================
-- CONVERSATIONS TABLES
-- =============================================

-- Tabela principal de conversações
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Auto-gerado da primeira pergunta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Mensagens da conversação (histórico)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB, -- chunks usados, tokens, custo, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at);

-- RLS (Row Level Security) - usuário só vê suas conversas
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê apenas suas conversas
CREATE POLICY conversations_user_policy ON conversations
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Usuário vê apenas mensagens de suas conversas
CREATE POLICY messages_user_policy ON conversation_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- COMENTÁRIOS (DOCUMENTAÇÃO)
-- =============================================

COMMENT ON TABLE conversations IS 'Conversações do chat - agrupa mensagens de uma sessão';
COMMENT ON TABLE conversation_messages IS 'Mensagens individuais (user/assistant) de cada conversação';
COMMENT ON COLUMN conversation_messages.metadata IS 'JSON com chunks usados, tokens, custo, sources, etc';
```

**Ações:**
```powershell
# 1. Criar arquivo
code backend/migrations/create-conversations-tables.sql

# 2. Colar conteúdo acima

# 3. Executar no Supabase SQL Editor
# - Abrir: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# - Colar todo o SQL
# - Executar
```

**✅ CHECKPOINT 2.1:**
```powershell
# Verificar se tabelas foram criadas no Supabase Dashboard:
# Database > Tables > Procurar:
# - conversations (4 colunas)
# - conversation_messages (5 colunas)

# Ou via script SQL:
# SELECT table_name FROM information_schema.tables 
# WHERE table_name IN ('conversations', 'conversation_messages');
```

**❌ Se houver erro:**
- Verificar sintaxe SQL
- Checar se `users` table existe
- Conferir permissões de execução no Supabase

---

### **PASSO 2.2: Adicionar types para conversação**

**Arquivo:** `backend/src/types/conversation.types.ts` (novo)

```typescript
/**
 * Types para sistema de conversação
 */

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    chunks_used?: number;
    tokens_input?: number;
    tokens_output?: number;
    cost?: number;
    sources?: Array<{
      document_id: string;
      document_name: string;
      similarity: number;
    }>;
  };
  created_at: string;
}

export interface CreateConversationRequest {
  user_id: string;
  title: string; // Auto-gerado ou fornecido
}

export interface CreateMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}
```

**✅ CHECKPOINT 2.2:**
```powershell
npx tsc --noEmit
# Deve compilar sem erros
```

---

### **PASSO 2.3: Atualizar `ChatRequest` e `ChatResponse` interfaces**

**Arquivo:** `backend/src/services/chat.service.ts`

**Mudança:**
```typescript
// Localizar interface ChatRequest - linha ~30
export interface ChatRequest {
  user_id: string;
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_id?: string;
  unit_name?: string;
  query: string;
  conversationId?: string; // ADICIONAR: ID da conversa (opcional)
  filters?: {
    document_type?: string;
    max_results?: number;
  };
}

// Localizar interface ChatResponse - linha ~50
export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  conversationId: string; // ADICIONAR: Sempre retornar ID da conversa
  metadata: {
    query: string;
    user_profile: string;
    chunks_found: number;
    tokens_input: number;
    tokens_output: number;
    tokens_total: number;
    cost_search: number;
    cost_llm: number;
    cost_total: number;
    model: string;
    prompt_version: string;
    duration_ms: number;
  };
  error?: string;
}
```

**✅ CHECKPOINT 2.3:**
```powershell
npx tsc --noEmit
# Pode haver erros temporários - normal nesta etapa
# Vamos corrigir nos próximos passos
```

---

### **PASSO 2.4: Criar `conversation.service.ts`**

**Arquivo:** `backend/src/services/conversation.service.ts` (novo)

```typescript
/**
 * Conversation Service
 * Gerencia histórico de conversações
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Conversation, 
  ConversationMessage,
  CreateConversationRequest,
  CreateMessageRequest 
} from '../types/conversation.types';

class ConversationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Criar nova conversação
   */
  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        id: uuidv4(),
        user_id: request.user_id,
        title: request.title,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar conversação: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar conversação por ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Erro ao buscar conversação: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar últimas conversações do usuário
   */
  async getUserConversations(userId: string, limit = 20): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar conversações: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Adicionar mensagem à conversação
   */
  async addMessage(request: CreateMessageRequest): Promise<ConversationMessage> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .insert({
        id: uuidv4(),
        conversation_id: request.conversation_id,
        role: request.role,
        content: request.content,
        metadata: request.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar mensagem: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar histórico de mensagens (últimas N)
   */
  async getMessages(conversationId: string, limit = 10): Promise<ConversationMessage[]> {
    const { data, error } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }) // Ordem cronológica
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar mensagens: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Deletar conversação (e todas as mensagens - CASCADE)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Erro ao deletar conversação: ${error.message}`);
    }
  }

  /**
   * Gerar título automático da conversa baseado na primeira pergunta
   */
  generateTitle(firstQuery: string): string {
    // Limitar a 50 caracteres
    const truncated = firstQuery.substring(0, 50);
    return truncated.length < firstQuery.length ? `${truncated}...` : truncated;
  }
}

// Singleton
const conversationService = new ConversationService();
export default conversationService;
```

**✅ CHECKPOINT 2.4:**
```powershell
npx tsc --noEmit
# Deve compilar sem erros
```

---

### **PASSO 2.5: Modificar `chat.service.ts` para usar conversações**

**Arquivo:** `backend/src/services/chat.service.ts`

**Mudanças (usar multi_replace se possível):**

1. **Adicionar import:**
```typescript
// No topo do arquivo, após outros imports
import conversationService from './conversation.service';
import type { ConversationMessage } from '../types/conversation.types';
```

2. **Modificar método `ask()` - INÍCIO:**
```typescript
async ask(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();

  console.log('[ChatService] Nova pergunta recebida:', {
    user_id: request.user_id,
    profile: request.user_profile,
    query: request.query.substring(0, 100),
    conversationId: request.conversationId || 'nova conversa',
  });

  try {
    // 1. Validar request
    this.validateRequest(request);

    // 2. NOVO: Gerenciar conversação
    let conversationId = request.conversationId;
    let conversationHistory: ConversationMessage[] = [];

    if (conversationId) {
      // Conversa existente - buscar histórico
      const conversation = await conversationService.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversação não encontrada');
      }
      
      if (conversation.user_id !== request.user_id) {
        throw new Error('Acesso negado à conversação');
      }

      // Buscar últimas 4 mensagens (2 pares user/assistant)
      conversationHistory = await conversationService.getMessages(conversationId, 4);
      
      console.log(`[ChatService] Histórico recuperado: ${conversationHistory.length} mensagens`);
    } else {
      // Nova conversa - criar
      const title = conversationService.generateTitle(request.query);
      const newConversation = await conversationService.createConversation({
        user_id: request.user_id,
        title
      });
      conversationId = newConversation.id;
      
      console.log(`[ChatService] Nova conversa criada: ${conversationId}`);
    }

    // 3. Salvar pergunta do usuário
    await conversationService.addMessage({
      conversation_id: conversationId,
      role: 'user',
      content: request.query,
    });

    // 4. Executar busca semântica (RAG) - CÓDIGO EXISTENTE
    const searchResult = await this.performSemanticSearch(request);
    
    // ... resto do código continua igual ...
```

3. **Modificar construção do contexto - incluir histórico:**
```typescript
    // 4. Montar contexto para o LLM
    const context: ChatContext = {
      user_profile: request.user_profile,
      unit_name: request.unit_name,
      query: request.query,
      chunks: searchResult.results.map((chunk: SearchResultChunk) => ({
        content: chunk.content,
        source: {
          document_name: chunk.source.document_name,
          document_type: chunk.source.document_type,
        },
        similarity: chunk.similarity,
        metadata: chunk.metadata,
      })),
      conversationHistory, // ADICIONAR: Histórico da conversa
    };
```

4. **Modificar retorno final - incluir conversationId:**
```typescript
    // 7. Formatar fontes citadas
    const sources: ChatSource[] = searchResult.results.map((chunk: SearchResultChunk) => ({
      document_id: chunk.source.document_id,
      document_name: chunk.source.document_name,
      document_type: chunk.source.document_type,
      chunk_content: chunk.content.substring(0, 200) + '...',
      similarity: chunk.similarity,
    }));

    // 8. Salvar resposta do assistente
    await conversationService.addMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: llmResponse.answer,
      metadata: {
        chunks_used: searchResult.results.length,
        tokens_input: llmResponse.tokens_input,
        tokens_output: llmResponse.tokens_output,
        cost: llmResponse.cost,
        sources: sources.slice(0, 3), // Top 3 sources
      }
    });

    // 9. Retornar resposta completa
    return {
      success: true,
      answer: llmResponse.answer,
      sources,
      conversationId, // ADICIONAR: Retornar ID da conversa
      metadata: {
        // ... resto igual
      },
    };
```

**✅ CHECKPOINT 2.5:**
```powershell
npx tsc --noEmit
# Deve compilar (pode haver warnings sobre ChatContext)
```

---

### **PASSO 2.6: Atualizar `ChatContext` interface para suportar histórico**

**Arquivo:** `backend/src/prompts/master.prompt.ts`

```typescript
// Localizar interface ChatContext - linha ~175
export interface ChatContext {
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_name?: string;
  query: string;
  chunks: Array<{
    content: string;
    source: {
      document_name: string;
      document_type: string;
    };
    similarity: number;
    metadata?: {
      year?: number;
      education_stage?: string;
      domain?: string;
      subdomain?: string;
    };
  }>;
  conversationHistory?: Array<{  // ADICIONAR
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**✅ CHECKPOINT 2.6:**
```powershell
npx tsc --noEmit
# Agora deve compilar sem erros
```

---

### **PASSO 2.7: Modificar `buildChatPrompt()` para incluir histórico**

**Arquivo:** `backend/src/prompts/master.prompt.ts`

```typescript
// Localizar função buildChatPrompt() - após construir chunksContext

export function buildChatPrompt(context: ChatContext): string {
  const { user_profile, unit_name, query, chunks, conversationHistory } = context;

  // ... código de governanceContext existente ...

  // ... código de chunksContext existente ...

  // ADICIONAR: Contexto de histórico da conversa
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = '\n\n--- HISTÓRICO DA CONVERSA ---\n';
    historyContext += 'Mensagens anteriores nesta sessão:\n\n';
    
    conversationHistory.forEach((msg, idx) => {
      const speaker = msg.role === 'user' ? '👤 Usuário' : '🤖 Assistente';
      historyContext += `${speaker}: ${msg.content}\n\n`;
    });
    
    historyContext += '---\n';
    historyContext += '⚠️ Use este histórico para entender referências como "e dos anos finais?", "e em 2024?", "e a outra escola?"\n';
  }

  // Prompt completo
  return `${governanceContext}
${historyContext}
${chunksContext}

---

**PERGUNTA DO USUÁRIO:**
${query}

**INSTRUÇÕES:**
Responda baseado EXCLUSIVAMENTE nos documentos acima${conversationHistory && conversationHistory.length > 0 ? ' e no histórico da conversa' : ''}. Cite as fontes ao final. Se não houver informação suficiente, seja honesto sobre isso.`;
}
```

**✅ CHECKPOINT 2.7:**
```powershell
npx tsc --noEmit
# Deve compilar sem erros
```

---

### **PASSO 2.8: Atualizar route de chat**

**Arquivo:** `backend/src/routes/chat.routes.ts`

```typescript
// Localizar rota POST /ask - linha ~76
router.post('/ask', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userProfile = (req as any).user?.role;
    const unitId = undefined;
    const unitName = undefined;

    const { query, filters, conversationId } = req.body; // ADICIONAR conversationId

    // ... validações existentes ...

    // Montar request
    const chatRequest: ChatRequest = {
      user_id: userId,
      user_profile: userProfile,
      unit_id: unitId,
      unit_name: unitName,
      query: query.trim(),
      conversationId, // ADICIONAR
      filters: filters || {},
    };

    // Processar pergunta
    const response = await chatService.ask(chatRequest);

    return res.json({
      success: response.success,
      data: {
        answer: response.answer,
        sources: response.data.sources,
        conversationId: response.conversationId, // ADICIONAR no retorno
        usage: {
          total_tokens: response.metadata.tokens_total,
          estimated_cost: response.metadata.cost_total,
        },
      },
    });
  } catch (error) {
    // ... tratamento de erro existente ...
  }
});
```

**✅ CHECKPOINT 2.8:**
```powershell
npx tsc --noEmit
# Deve compilar sem erros
```

---

### **PASSO 2.9: Adicionar endpoint para listar conversações**

**Arquivo:** `backend/src/routes/chat.routes.ts`

```typescript
// ADICIONAR após a rota /ask

/**
 * GET /api/chat/conversations
 * Listar conversações do usuário
 */
router.get('/conversations', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = await conversationService.getUserConversations(userId, limit);

    return res.json({
      success: true,
      data: {
        conversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao buscar conversações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar conversações'
    });
  }
});

/**
 * GET /api/chat/conversations/:id/messages
 * Buscar mensagens de uma conversação
 */
router.get('/conversations/:id/messages', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verificar se conversa pertence ao usuário
    const conversation = await conversationService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversação não encontrada'
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const messages = await conversationService.getMessages(conversationId, limit);

    return res.json({
      success: true,
      data: {
        conversation,
        messages,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao buscar mensagens:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagens'
    });
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Deletar conversação
 */
router.delete('/conversations/:id', authGuard, chatAllowedGuard, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;

    // Verificar permissão
    const conversation = await conversationService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversação não encontrada'
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    await conversationService.deleteConversation(conversationId);

    return res.json({
      success: true,
      message: 'Conversação deletada com sucesso'
    });
  } catch (error) {
    console.error('[ChatRoutes] Erro ao deletar conversação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar conversação'
    });
  }
});
```

**✅ CHECKPOINT 2.9:**
```powershell
npx tsc --noEmit
# Importar conversationService no topo se ainda não estiver
```

---

### **PASSO 2.10: Criar script de teste de conversação**

**Arquivo:** `backend/scripts/test-conversation-flow.ts`

```typescript
/**
 * Teste: Fluxo completo de conversação com contexto
 */
import chatService, { ChatRequest } from '../src/services/chat.service';

const testUserId = 'test-user-123';

async function runConversationTest() {
  console.log('🧪 TESTE: Fluxo de Conversação com Histórico\n');
  console.log('='.repeat(80));

  try {
    // PERGUNTA 1: Inicial
    console.log('\n📝 PERGUNTA 1: "Qual o IDEB de 2023?"');
    const request1: ChatRequest = {
      user_id: testUserId,
      user_profile: 'TI',
      query: 'Qual o IDEB de 2023?',
    };

    const response1 = await chatService.ask(request1);
    console.log(`✅ Resposta: ${response1.answer.substring(0, 200)}...`);
    console.log(`📊 ConversationId: ${response1.conversationId}`);
    
    const conversationId = response1.conversationId;

    // PERGUNTA 2: Acompanhamento (usa contexto)
    console.log('\n📝 PERGUNTA 2: "E dos anos finais?" (deve usar contexto)');
    const request2: ChatRequest = {
      user_id: testUserId,
      user_profile: 'TI',
      query: 'E dos anos finais?',
      conversationId, // PASSA O ID DA CONVERSA
    };

    const response2 = await chatService.ask(request2);
    console.log(`✅ Resposta: ${response2.answer.substring(0, 200)}...`);
    console.log(`📊 Mesmo conversationId: ${response2.conversationId === conversationId ? 'SIM ✅' : 'NÃO ❌'}`);

    // PERGUNTA 3: Outro acompanhamento
    console.log('\n📝 PERGUNTA 3: "E em 2024?"');
    const request3: ChatRequest = {
      user_id: testUserId,
      user_profile: 'TI',
      query: 'E em 2024?',
      conversationId,
    };

    const response3 = await chatService.ask(request3);
    console.log(`✅ Resposta: ${response3.answer.substring(0, 200)}...`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE COMPLETO!');
    console.log('\n💡 Verifique se:');
    console.log('  1. As 3 respostas usaram o mesmo conversationId');
    console.log('  2. A pergunta 2 entendeu que "anos finais" se refere ao IDEB');
    console.log('  3. A pergunta 3 entendeu que "2024" se refere ao IDEB também');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  }
}

runConversationTest();
```

**✅ CHECKPOINT 2.10:**
```powershell
# ANTES de executar, garantir que backend está rodando
cd backend
npm run dev

# Em outro terminal:
npx tsx scripts/test-conversation-flow.ts

# Resultado esperado:
# ✅ 3 respostas geradas
# ✅ Mesmo conversationId nas 3
# ✅ Contexto preservado entre perguntas
```

---

### **PASSO 2.11: Testar endpoints de conversação**

**Script de teste:** `backend/scripts/test-conversation-endpoints.ps1`

```powershell
# Script PowerShell para testar endpoints
$baseUrl = "http://localhost:3001/api/v1"

Write-Host "🧪 TESTE: Endpoints de Conversação`n" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

# 1. Login
Write-Host "`n1️⃣ Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "✅ Token obtido" -ForegroundColor Green

# 2. Primeira pergunta (nova conversa)
Write-Host "`n2️⃣ Pergunta 1: 'Qual o IDEB de 2023?'" -ForegroundColor Yellow
$chatBody1 = @{
    query = "Qual o IDEB de 2023?"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$chatResponse1 = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody1 -Headers $headers
$conversationId = $chatResponse1.data.conversationId
Write-Host "✅ ConversationId: $conversationId" -ForegroundColor Green
Write-Host "📄 Resposta: $($chatResponse1.data.answer.Substring(0, 150))..." -ForegroundColor White

# 3. Segunda pergunta (mesma conversa)
Write-Host "`n3️⃣ Pergunta 2: 'E dos anos finais?'" -ForegroundColor Yellow
$chatBody2 = @{
    query = "E dos anos finais?"
    conversationId = $conversationId
} | ConvertTo-Json

$chatResponse2 = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody2 -Headers $headers
Write-Host "✅ Mesmo conversationId: $($chatResponse2.data.conversationId -eq $conversationId)" -ForegroundColor Green
Write-Host "📄 Resposta: $($chatResponse2.data.answer.Substring(0, 150))..." -ForegroundColor White

# 4. Listar conversações
Write-Host "`n4️⃣ Listar conversações do usuário" -ForegroundColor Yellow
$conversations = Invoke-RestMethod -Uri "$baseUrl/chat/conversations" -Method GET -Headers $headers
Write-Host "✅ Total de conversas: $($conversations.data.total)" -ForegroundColor Green

# 5. Buscar mensagens da conversa
Write-Host "`n5️⃣ Buscar mensagens da conversa" -ForegroundColor Yellow
$messages = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$conversationId/messages" -Method GET -Headers $headers
Write-Host "✅ Total de mensagens: $($messages.data.total)" -ForegroundColor Green
Write-Host "   (Esperado: 4 mensagens - 2 user + 2 assistant)" -ForegroundColor Gray

# 6. Deletar conversa
Write-Host "`n6️⃣ Deletar conversa" -ForegroundColor Yellow
$delete = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$conversationId" -Method DELETE -Headers $headers
Write-Host "✅ Conversa deletada" -ForegroundColor Green

Write-Host "`n" ("=" * 80) -ForegroundColor Gray
Write-Host "✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
```

**✅ CHECKPOINT 2.11:**
```powershell
# Executar script
.\backend\scripts\test-conversation-endpoints.ps1

# Resultado esperado:
# ✅ Login OK
# ✅ 2 perguntas com mesmo conversationId
# ✅ Lista de conversações retorna dados
# ✅ Mensagens da conversa = 4 (2 user + 2 assistant)
# ✅ Deleção funciona
```

---

### **🎉 FASE 2 COMPLETA!**

**Resultado esperado:**
- ✅ Sistema de conversação funcionando
- ✅ Histórico preservado entre perguntas
- ✅ Endpoints CRUD de conversações
- ✅ Contexto usado pelo LLM

**Commit sugerido:**
```bash
git add backend/migrations/create-conversations-tables.sql
git add backend/src/types/conversation.types.ts
git add backend/src/services/conversation.service.ts
git add backend/src/services/chat.service.ts
git add backend/src/prompts/master.prompt.ts
git add backend/src/routes/chat.routes.ts
git add backend/scripts/test-conversation-*.ts
git commit -m "feat: implementa sistema de conversação com histórico de contexto"
```

---

## 🎯 FASE 3: Cache de Embeddings (OPCIONAL)

**Objetivo:** Economizar custos com queries repetidas

**Tempo estimado:** 2-3 horas  
**Impacto:** Médio (economia financeira)  
**Risco:** Baixo (não afeta funcionalidade existente)

### **Esta fase pode ser implementada depois se desejado**

Passos resumidos:
1. Criar tabela `query_embeddings_cache`
2. Modificar `embedding.service.ts` para verificar cache antes de gerar
3. Implementar limpeza de cache antigo (>7 dias)
4. Adicionar métricas de hit rate

---

## ✅ CHECKLIST FINAL

Após completar todas as fases, verificar:

- [ ] Backend inicia sem erros (`npm run dev`)
- [ ] Compilação TypeScript OK (`npx tsc --noEmit`)
- [ ] Testes de metadata passam
- [ ] Testes de conversação passam
- [ ] Endpoints retornam conversationId
- [ ] Histórico preservado entre perguntas
- [ ] RLS funcionando no Supabase
- [ ] Logs de auditoria salvando
- [ ] Performance mantida (<4s por query)

---

## 🆘 Troubleshooting

### Erro: "Property 'metadata' does not exist"
**Solução:** Verificar se interface `ChatContext` foi atualizada com campo `metadata?`

### Erro: "Table 'conversations' does not exist"
**Solução:** Executar SQL migration no Supabase Dashboard

### Erro: "Cannot read property 'conversationId' of undefined"
**Solução:** Verificar se `ChatResponse` interface inclui `conversationId: string`

### Erro: RLS bloqueando acesso
**Solução:** Verificar policies no Supabase e usar service role key

### Performance lenta (>10s)
**Solução:** 
- Verificar se embeddings existem
- Checar índices nas tabelas
- Reduzir histórico de mensagens (limit 4 → 2)

---

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Bom trabalho! 🚀**
