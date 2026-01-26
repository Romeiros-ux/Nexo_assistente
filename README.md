# Nexo Assistente - Sistema de Gestão Documental Educacional

Sistema de gestão documental com IA para instituições educacionais, permitindo upload, classificação automática e consulta inteligente de documentos.

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite + Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Google Gemini 1.5 Flash
- **Deployment**: Render (Frontend) + Supabase (Backend)

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Conta Supabase (projeto: tbrzrsvokzigmiprzhbb)
- Chave da API do Google Gemini
- Conta no Render (para deploy)

## ⚙️ Configuração

### 1. Clonar o Repositório

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
```sh
git clone https://github.com/seu-usuario/Nexo_assistente.git
cd Nexo_assistente
```

### 2. Instalar Dependências

```sh
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://tbrzrsvokzigmiprzhbb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_aqui
VITE_SUPABASE_PROJECT_ID=tbrzrsvokzigmiprzhbb
```

### 4. Configurar Google Gemini API

**IMPORTANTE**: Você precisa configurar a chave do Google Gemini no Supabase para que o sistema funcione.

Consulte o guia completo: [GOOGLE_GEMINI_SETUP.md](./GOOGLE_GEMINI_SETUP.md)

Resumo:
1. Obtenha uma chave em: https://makersuite.google.com/app/apikey
2. Configure no Supabase: `Settings > Edge Functions > Secrets`
3. Nome: `GOOGLE_AI_API_KEY`
4. Valor: Sua chave do Google

### 5. Rodar Localmente

```sh
npm run dev
```

Acesse: http://localhost:8080

## 🏗️ Estrutura do Projeto

```
Nexo_assistente/
├── src/
│   ├── components/      # Componentes React
│   ├── contexts/        # Context API (Auth)
│   ├── hooks/          # Custom hooks
│   ├── integrations/   # Supabase client
│   ├── lib/            # Utilitários
│   ├── pages/          # Páginas da aplicação
│   └── types/          # TypeScript types
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   │   ├── chat-query/
│   │   ├── documents-ingest/
│   │   ├── documents-ingest-link/
│   │   └── admin-users/
│   └── migrations/     # Schema do banco
├── public/             # Assets estáticos
└── docs/              # Documentação

```

## 📦 Deploy

### Frontend (Render)

Consulte: [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

### Backend (Supabase)

As Edge Functions já foram deployadas. Para atualizações:

```sh
supabase link --project-ref tbrzrsvokzigmiprzhbb
supabase functions deploy
```

## 🔐 Sistema de Permissões

O sistema usa controle de acesso baseado em funções (RBAC):

- **ti**: Acesso total (upload, gerenciamento de usuários, configurações)
- **secretaria**: Upload e edição de documentos
- **coordenacao**: Visualização e consulta
- **diretor**: Visualização e consulta

## 🤖 Funcionalidades de IA

### Chat Inteligente
- Busca semântica em documentos usando tsvector
- Respostas contextualizadas pelo Google Gemini
- Histórico de conversas persistente

### Classificação Automática
- Área temática
- Tipo de documento (normativo, relatório, plano, etc.)
- Ano de referência, datas de vigência
- Tags e palavras-chave automáticas

### Suporte a Múltiplos Formatos
- PDF, Word (DOCX), Excel (XLSX)
- PowerPoint (PPTX)
- Arquivos de texto (TXT, MD, CSV, JSON, XML, HTML)
- Captura de conteúdo de URLs

## 📚 Documentação Adicional

- [Configuração Google Gemini](./GOOGLE_GEMINI_SETUP.md)
- [Deploy no Render](./DEPLOY_RENDER.md)
- [Análise Técnica Completa](./ANALISE_COMPLETA.md)

## 🐛 Troubleshooting

### Erro: "GOOGLE_AI_API_KEY is not configured"
Configure a chave do Google Gemini seguindo [GOOGLE_GEMINI_SETUP.md](./GOOGLE_GEMINI_SETUP.md)

### Erro de autenticação
Verifique se as variáveis `VITE_SUPABASE_*` estão corretas no `.env`

### Edge Functions não respondem
Verifique os logs: https://supabase.com/dashboard/project/tbrzrsvokzigmiprzhbb/logs/edge-functions

## 📄 Licença

Este projeto é privado e proprietário.
