# Configuração Google Gemini API

## Status Atual ✅

Todas as Edge Functions foram migradas com sucesso para usar diretamente a API do Google Gemini:

- ✅ **chat-query** - Responde perguntas dos usuários usando IA e busca de documentos
- ✅ **documents-ingest** - Processa uploads de arquivos e classifica com IA  
- ✅ **documents-ingest-link** - Processa documentos de URLs e classifica com IA
- ✅ **admin-users** - Gerenciamento de usuários (não usa IA)

## Próximos Passos Obrigatórios

### 1. Obter Chave da API do Google Gemini

Visite: https://makersuite.google.com/app/apikey

1. Faça login com sua conta Google
2. Clique em "Create API Key"
3. Copie a chave gerada (formato: `AIza...`)

### 2. Configurar a Chave no Supabase

#### Opção A: Via Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/tbrzrsvokzigmiprzhbb/settings/secrets
2. Clique em "New secret"
3. Nome: `GOOGLE_AI_API_KEY`
4. Valor: Cole sua chave do Google
5. Clique em "Add secret"

#### Opção B: Via CLI

```bash
supabase secrets set GOOGLE_AI_API_KEY=sua_chave_aqui
```

### 3. Testar o Sistema

Após configurar a chave:

```bash
# Teste localmente
npm run dev

# Ou test Edge Functions diretamente
supabase functions serve
```

Faça login no sistema e teste:
- Chat: Faça uma pergunta sobre documentos
- Upload: Envie um documento para classificação automática
- Link: Adicione um documento via URL

## Informações Técnicas

### Endpoint da API
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
```

### Modelo Utilizado
- **gemini-1.5-flash** - Rápido e eficiente para classificação e respostas

### Formato de Requisição
```typescript
{
  contents: [{
    parts: [{ text: "seu prompt aqui" }]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0.3
  }
}
```

### Formato de Resposta
```typescript
const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
```

## Mudanças Realizadas

### Antes (Lovable AI Gateway)
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Formato: OpenAI-compatible
- Autenticação: `Authorization: Bearer ${AI_API_KEY}`
- Variável: `AI_API_KEY` ou `LOVABLE_API_KEY`

### Depois (Google Gemini Direto)
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Formato: Gemini native API
- Autenticação: Query parameter `?key=${GOOGLE_AI_API_KEY}`
- Variável: `GOOGLE_AI_API_KEY`

## Limites e Preços

O Google Gemini API tem:
- **Free Tier**: 15 requisições por minuto (RPM)
- **Paid Tier**: Até 1000 RPM

Para mais informações: https://ai.google.dev/pricing

## Troubleshooting

### Erro: "GOOGLE_AI_API_KEY is not configured"
- Você não configurou a chave no Supabase
- Siga o passo 2 acima

### Erro 429: "Rate limits exceeded"
- Você excedeu o limite gratuito de 15 requisições/minuto
- Aguarde 1 minuto ou considere upgrade para tier pago

### Erro 400: "Invalid API key"
- Sua chave está incorreta
- Gere uma nova chave em https://makersuite.google.com/app/apikey

### As respostas estão estranhas
- O modelo Gemini pode responder diferente do modelo anterior
- Ajuste os prompts se necessário nos arquivos das Edge Functions

## Arquivos Modificados

- `supabase/functions/chat-query/index.ts` - Linha 297+
- `supabase/functions/documents-ingest/index.ts` - Função `classifyWithAI`
- `supabase/functions/documents-ingest-link/index.ts` - Função `classifyWithAI`
- `.env` - Removido `AI_API_KEY`, adicionar `GOOGLE_AI_API_KEY` (opcional, apenas para testes locais)

## Suporte

Se tiver problemas:
1. Verifique os logs no Supabase Dashboard: https://supabase.com/dashboard/project/tbrzrsvokzigmiprzhbb/logs/edge-functions
2. Verifique se a chave está configurada corretamente
3. Teste com curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=SUA_CHAVE" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```
