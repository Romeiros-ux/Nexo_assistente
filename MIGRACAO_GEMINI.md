# Migração para Google Gemini API - Resumo das Alterações

## 📅 Data: Janeiro 2025

## 🎯 Objetivo

Migrar o sistema de chatbot de usar o gateway Lovable AI para usar diretamente a API do Google Gemini, garantindo independência total da plataforma Lovable.

## ✅ Status: CONCLUÍDO

Todas as Edge Functions foram migradas e deployadas com sucesso no projeto Supabase `tbrzrsvokzigmiprzhbb`.

## 📝 Alterações Realizadas

### 1. Edge Functions Modificadas

#### chat-query/index.ts
**Linhas alteradas**: ~297+

**Antes**:
```typescript
const apiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  }),
});
const answer = aiData?.choices?.[0]?.message?.content;
```

**Depois**:
```typescript
const geminiKey = Deno.env.get("GOOGLE_AI_API_KEY");
const aiResp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
    }),
  }
);
const answer = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
```

**Mudanças**:
- URL: Lovable gateway → Google Gemini API direta
- Autenticação: Header Authorization → Query parameter
- Formato request: OpenAI-compatible → Gemini native
- Formato response: `choices[0].message.content` → `candidates[0].content.parts[0].text`
- Variável de ambiente: `AI_API_KEY`/`LOVABLE_API_KEY` → `GOOGLE_AI_API_KEY`

#### documents-ingest/index.ts
**Função alterada**: `classifyWithAI()`

**Antes**:
```typescript
const key = Deno.env.get("LOVABLE_API_KEY");
const body = {
  model: "google/gemini-3-flash-preview",
  messages: [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ],
  tools: [{
    type: "function",
    function: {
      name: "classify_document",
      parameters: { /* schema */ }
    }
  }],
  tool_choice: { type: "function", function: { name: "classify_document" } }
};
const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${key}` },
  body: JSON.stringify(body)
});
const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
const parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
```

**Depois**:
```typescript
const key = Deno.env.get("GOOGLE_AI_API_KEY");
const schema = {
  type: "object",
  properties: { /* campos */ },
  required: [ /* campos obrigatórios */ ],
  additionalProperties: false
};
const body = {
  contents: [{
    parts: [{ text: `${system}\n\n${prompt}\n\nResponda APENAS com JSON válido no formato do schema acima.` }]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0.3,
  }
};
const resp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
  {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }
);
const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
const parsed = JSON.parse(responseText);
```

**Mudanças**:
- De OpenAI function calling → Gemini responseSchema (JSON mode)
- Schema movido de `tools[].function.parameters` → `generationConfig.responseSchema`
- Response parsing simplificado (JSON direto em vez de tool_calls)
- Temperatura ajustada para 0.3 (mais determinístico)

#### documents-ingest-link/index.ts
**Alterações idênticas** a `documents-ingest/index.ts`, aplicadas à função `classifyWithAI()`.

### 2. Variáveis de Ambiente

#### Removidas:
- `AI_API_KEY`
- `LOVABLE_API_KEY`

#### Adicionadas:
- `GOOGLE_AI_API_KEY` (necessária em todas as 3 Edge Functions)

### 3. Documentação Criada/Atualizada

#### Novos arquivos:
- **GOOGLE_GEMINI_SETUP.md**: Guia completo de configuração da API do Google Gemini
  - Como obter chave
  - Como configurar no Supabase
  - Troubleshooting
  - Limites e preços

#### Arquivos atualizados:
- **README.md**: Removidas referências ao Lovable, adicionadas instruções Gemini
- **.env**: Template atualizado com `GOOGLE_AI_API_KEY`

### 4. Arquivos de Backup Criados

Durante a migração:
- `supabase/functions/documents-ingest/index.backup.ts`

## 🔄 Diferenças de API

### Lovable AI Gateway (OpenAI-compatible)
- **URL**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Auth**: `Authorization: Bearer ${API_KEY}`
- **Modelo**: `google/gemini-3-flash-preview` (gateway do Lovable)
- **Request**:
  ```json
  {
    "model": "google/gemini-3-flash-preview",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "choices": [{
      "message": {
        "content": "resposta aqui"
      }
    }]
  }
  ```

### Google Gemini API (Native)
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Auth**: Query parameter `?key=${API_KEY}`
- **Modelo**: `gemini-1.5-flash` (direto do Google)
- **Request**:
  ```json
  {
    "contents": [{
      "parts": [{ "text": "..." }]
    }],
    "generationConfig": {
      "responseMimeType": "application/json",
      "responseSchema": { ... },
      "temperature": 0.3
    }
  }
  ```
- **Response**:
  ```json
  {
    "candidates": [{
      "content": {
        "parts": [{
          "text": "resposta aqui"
        }]
      }
    }]
  }
  ```

## 📊 Benefícios da Migração

### ✅ Vantagens:
1. **Independência total** da plataforma Lovable
2. **Controle direto** sobre custos e limites da API
3. **Acesso a features nativas** do Gemini (responseSchema, etc.)
4. **Melhor debugging** (logs diretos do Google)
5. **Possibilidade de trocar de modelo** facilmente (Gemini Pro, etc.)

### ⚠️ Considerações:
1. **Rate limits do Free Tier**: 15 requisições/minuto (vs ilimitado no Lovable)
2. **Necessidade de chave própria**: Cada desenvolvedor precisa de uma chave
3. **Possíveis diferenças de resposta**: Gemini pode responder diferente do modelo usado no gateway

## 🚀 Deploy

### Comandos Executados:
```bash
# Link com projeto Supabase
supabase link --project-ref tbrzrsvokzigmiprzhbb

# Deploy de todas as Edge Functions
supabase functions deploy
```

### Resultado:
```
✅ admin-users - No change
✅ chat-query - Deployed (updated)
✅ documents-ingest - Deployed (updated)
✅ documents-ingest-link - Deployed (updated)
```

## 📋 Checklist Pós-Migração

- [x] Migrar código de todas as Edge Functions
- [x] Deploy das Edge Functions no Supabase
- [x] Criar documentação de configuração do Gemini
- [x] Atualizar README.md
- [ ] **PENDENTE**: Obter chave do Google Gemini
- [ ] **PENDENTE**: Configurar `GOOGLE_AI_API_KEY` no Supabase
- [ ] **PENDENTE**: Testar sistema end-to-end
- [ ] **PENDENTE**: Deploy no Render (frontend)

## ⚡ Próximos Passos Imediatos

### 1. Configurar Chave da API (BLOQUEANTE)
Sem esta etapa, o sistema NÃO funcionará:

```bash
# 1. Obter chave em: https://makersuite.google.com/app/apikey
# 2. Configurar no Supabase:
supabase secrets set GOOGLE_AI_API_KEY=AIza...
```

### 2. Testar Localmente
```bash
npm run dev
# Fazer login e testar chat e upload de documentos
```

### 3. Deploy no Render
Seguir [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

## 🐛 Problemas Encontrados e Soluções

### Problema 1: Declaração duplicada de `body`
**Sintoma**: Erro de sintaxe na linha 125 de `documents-ingest/index.ts`

**Causa**: Código antigo (OpenAI format) não foi completamente removido, resultando em duas declarações da variável `body`.

**Solução**: Remover completamente o bloco antigo com `tools`, `messages`, etc.

### Problema 2: Schema inválido em `documents-ingest-link`
**Sintoma**: `Expression expected at line 176`

**Causa**: Faltava `additionalProperties: false` no schema

**Solução**: Adicionar propriedade faltante na estrutura do schema

### Problema 3: Sintaxe `];` em vez de `}`
**Sintoma**: Parse error em `documents-ingest/index.ts`

**Causa**: Mix de sintaxe array `];` com objeto `}`

**Solução**: Corrigir para fechamento correto de objeto `}`

## 📞 Suporte

### Links Úteis:
- Supabase Dashboard: https://supabase.com/dashboard/project/tbrzrsvokzigmiprzhbb
- Google AI Studio: https://makersuite.google.com/app/apikey
- Gemini API Docs: https://ai.google.dev/tutorials/rest_quickstart
- Gemini Pricing: https://ai.google.dev/pricing

### Logs e Debug:
- Edge Functions Logs: https://supabase.com/dashboard/project/tbrzrsvokzigmiprzhbb/logs/edge-functions
- Teste direto da API:
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=SUA_CHAVE" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Olá"}]}]}'
  ```

## 👨‍💻 Autor

Migração realizada em: Janeiro 2025
Edge Functions deployadas em: tbrzrsvokzigmiprzhbb.supabase.co
