# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 🚀 Melhorias Recentes

### ✅ FASE 1: Metadata Enriquecida no Prompt (15/01/2026)

**Objetivo:** Tornar respostas mais precisas mostrando ano, etapa educacional e categoria de cada documento.

**Implementado:**
- ✅ Interface `ChatContext` atualizada com campo `metadata` opcional
- ✅ Display de ano nos chunks (ex: 📅 Ano: 2023)
- ✅ Display de etapa educacional com labels descritivas:
  - AI → Anos Iniciais (1º-5º ano)
  - AF → Anos Finais (6º-9º ano)
  - EM → Ensino Médio
  - EI → Educação Infantil
- ✅ Display de categoria/subdomain (ex: 📊 Categoria: IDEB)
- ✅ Emojis para melhor visualização (📅 📊 🎓 🎯)
- ✅ Metadata pass-through em `chat.service.ts`
- ✅ Testes unitários e de integração criados

**Impacto:**
- Respostas agora mencionam explicitamente ano e etapa (ex: "Em 2023, os Anos Iniciais...")
- LLM tem contexto temporal para distinguir entre diferentes anos
- Melhor compreensão de perguntas como "Qual o IDEB de 2023?"

**Arquivos modificados:**
- `backend/src/prompts/master.prompt.ts`
- `backend/src/services/chat.service.ts`
- `backend/scripts/test-metadata-enriched.ts` (novo)
- `backend/scripts/test-chat-integration.mjs` (novo)

---

### ✅ FASE 2: Histórico de Conversação (15/01/2026)

**Objetivo:** Permitir perguntas de acompanhamento sem repetir contexto, mantendo histórico da sessão.

**Implementado:**
- ✅ Tabelas `conversations` e `conversation_messages` no Supabase
- ✅ `ConversationService` para gerenciar histórico de conversas
- ✅ Integração do histórico no `chat.service.ts`
- ✅ Interface `ChatContext` atualizada com `conversationHistory`
- ✅ Função `buildChatPrompt()` inclui histórico formatado
- ✅ `ChatRequest` e `ChatResponse` com campo `conversationId`
- ✅ Novos endpoints REST:
  - `GET /api/chat/conversations` - Listar conversas
  - `GET /api/chat/conversations/:id/messages` - Mensagens de uma conversa
  - `DELETE /api/chat/conversations/:id` - Deletar conversa
- ✅ RLS (Row Level Security) - usuário só vê suas conversas
- ✅ Trigger automático para atualizar `updated_at`
- ✅ Testes de fluxo conversacional e endpoints

**Impacto:**
- 🎯 Perguntas de acompanhamento agora funcionam!
  - "Qual o IDEB de 2023?" → "E dos anos finais?" → "E em 2024?"
- 💬 Sistema mantém contexto entre perguntas da mesma sessão
- 📝 Histórico visível: "👤 Usuário: ... / 🤖 Assistente: ..."
- 🔒 Segurança: cada usuário vê apenas suas conversas (RLS)

**Arquivos modificados:**
- `backend/migrations/create-conversations-tables.sql` (novo)
- `backend/src/types/conversation.types.ts` (novo)
- `backend/src/services/conversation.service.ts` (novo)
- `backend/src/services/chat.service.ts`
- `backend/src/prompts/master.prompt.ts`
- `backend/src/routes/chat.routes.ts`
- `backend/scripts/test-conversation-flow.mjs` (novo)
- `backend/scripts/test-conversation-endpoints.ps1` (novo)

**Como testar:**
1. Backend: `npm run dev`
2. Testes automatizados: 
   - `node scripts/test-conversation-flow.mjs`
   - `.\scripts\test-conversation-endpoints.ps1`
3. Manual: Faça perguntas sequenciais e veja o contexto sendo mantido

**Próximo:** FASE 3 - Cache de Embeddings (economia de custos - opcional)
