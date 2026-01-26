# 🎓 Nexo Assistente - Assistente Educacional Virtual

Sistema de chat inteligente para consulta de documentos institucionais educacionais. Desenvolvido para secretarias municipais de educação, permite que gestores, coordenadores e diretores façam perguntas naturais sobre documentos e recebam respostas contextualizadas.

## 🚀 Deploy no Render

**Para fazer deploy no Render, consulte:** [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

## 📋 Funcionalidades

- 🤖 Chat com IA integrada (Google Gemini 3 Flash via Lovable API)
- 📚 Suporte para múltiplos formatos de documentos (PDF, DOCX, XLSX, CSV, TXT)
- 🔐 Sistema robusto de autenticação e permissões (RBAC)
- 🏢 Gestão de unidades escolares e usuários
- 📊 Extração e classificação automática de documentos
- 🔍 Busca full-text otimizada
- 📱 Interface responsiva e moderna

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **IA:** Lovable AI Gateway (Gemini 3 Flash)
- **Autenticação:** Supabase Auth

## 📦 Como rodar localmente

### Pré-requisitos

- Node.js 18+ (recomendado: 18.19.0)
- npm ou bun
- Conta no Supabase (já configurada)

### Instalação

1. Clone o repositório

1. Clone o repositório:
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd Nexo_assistente
```

2. Instale as dependências:
```bash
npm install
# ou
bun install
```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env` (ou crie um novo)
   - As variáveis já estão configuradas para o Supabase

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
bun dev
```

5. Acesse: http://localhost:8080

## 🏗️ Estrutura do Projeto

```
src/
├── components/        # Componentes React
│   ├── ui/           # Componentes base (Shadcn)
│   ├── ChatArea.tsx  # Interface principal do chat
│   ├── Header.tsx
│   └── ...
├── contexts/         # Contextos React (AuthContext)
├── hooks/           # Custom hooks
├── pages/           # Páginas da aplicação
│   ├── Index.tsx         # Chat principal
│   ├── Auth.tsx          # Login/Cadastro
│   ├── UsersAdmin.tsx    # Gestão de usuários
│   └── DocumentsAdmin.tsx # Gestão de documentos
├── integrations/    # Integrações externas
│   └── supabase/    # Cliente Supabase
└── types/           # TypeScript types

supabase/
├── functions/       # Edge Functions
│   ├── chat-query/           # Processa perguntas do chat
│   ├── documents-ingest/     # Ingere documentos
│   └── admin-users/          # Administração de usuários
└── migrations/      # Migrações do banco de dados
```

## 🔐 Sistema de Permissões

O sistema possui 4 níveis hierárquicos:

1. **TI** (mais alto): Acesso total, gerencia usuários e documentos
2. **Secretaria**: Visualiza todas as unidades
3. **Coordenação**: Acesso à sua unidade e algumas outras
4. **Diretor**: Acesso apenas à sua unidade

## 📚 Banco de Dados

O banco utiliza PostgreSQL (via Supabase) com:
- Row Level Security (RLS) para segurança
- Full-text search para busca otimizada
- Auditoria de todas as ações
- Migrações versionadas

Principais tabelas:
- `profiles`: Dados dos usuários
- `user_roles`: Permissões
- `units`: Unidades escolares
- `documents`: Metadados dos documentos
- `conversations` e `chat_messages`: Histórico do chat

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Linter
npm run test         # Testes
```

## 🌐 Deploy

### Render (Recomendado)

Consulte o guia completo: [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

### Outras Plataformas

O projeto também pode ser deployado em:
- Vercel
- Netlify
- Railway
- Fly.io

## 📝 Configuração do Supabase

As Edge Functions requerem a variável:
- `LOVABLE_API_KEY`: Chave da API Lovable AI

Configure via CLI do Supabase:
```bash
supabase secrets set LOVABLE_API_KEY=sua_chave_aqui
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto foi desenvolvido para uso institucional educacional.

## 🆘 Suporte

Para problemas ou dúvidas:
- Verifique os logs no Supabase Dashboard
- Consulte a documentação do Render
- Revise o arquivo DEPLOY_RENDER.md

---

**Desenvolvido com ❤️ usando Lovable, React, Supabase e IA**
