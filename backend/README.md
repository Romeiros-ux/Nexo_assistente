# Backend - Assistente Institucional Inteligente

Backend desenvolvido em Node.js + TypeScript para o Assistente Institucional Inteligente.

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas (Layered Architecture):

```
backend/
├── src/
│   ├── server.ts              # Ponto de entrada da aplicação
│   ├── app.ts                 # Configuração do Express
│   ├── config/                # Configurações (env, supabase, etc.)
│   ├── routes/                # Definição de rotas
│   ├── controllers/           # Lógica de controle das requisições
│   ├── services/              # Lógica de negócio
│   ├── repositories/          # Acesso ao banco de dados
│   ├── middlewares/           # Middlewares customizados
│   └── types/                 # Tipos TypeScript
├── .env                       # Variáveis de ambiente (não commitar)
├── .env.example               # Exemplo de variáveis de ambiente
├── package.json               # Dependências e scripts
└── tsconfig.json              # Configuração do TypeScript
```

## 📦 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express** - Framework web
- **Supabase** - Backend as a Service (PostgreSQL)
- **Zod** - Validação de schemas
- **Helmet** - Segurança HTTP headers
- **CORS** - Controle de acesso cross-origin
- **Morgan** - Logging de requisições

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+ ou Bun
- Conta no Supabase

### Instalação

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
# ou
bun install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

4. Inicie o servidor em modo desenvolvimento:
```bash
npm run dev
# ou
bun dev
```

O servidor estará disponível em `http://localhost:3001`

## 📝 Scripts Disponíveis

```bash
npm run dev      # Inicia o servidor em modo desenvolvimento
npm run build    # Compila o TypeScript para JavaScript
npm run start    # Inicia o servidor em produção (após build)
npm run lint     # Executa o linter
npm run format   # Formata o código com Prettier
```

## 🔍 Endpoints Disponíveis

### Health Check

- `GET /health` - Status básico da API
- `GET /health/detailed` - Status detalhado com dependências
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### API Root

- `GET /` - Informações sobre a API
- `GET /api/v1` - Informações sobre a versão da API

## 🏛️ Camadas da Aplicação

### 1. Routes (Rotas)
Define os endpoints da API e mapeia para os controllers apropriados.

### 2. Controllers (Controladores)
Recebe as requisições HTTP, valida dados e chama os services necessários.

### 3. Services (Serviços)
Contém a lógica de negócio da aplicação. Orquestra operações complexas.

### 4. Repositories (Repositórios)
Responsável por toda interação com o banco de dados (Supabase).

### 5. Middlewares
Funções que interceptam requisições para logging, autenticação, validação, etc.

## 🔐 Segurança

- **Helmet**: Protege contra vulnerabilidades conhecidas
- **CORS**: Controla acesso de diferentes origens
- **JWT**: Preparado para autenticação futura
- **Validation**: Validação de dados com Zod
- **Error Handling**: Tratamento seguro de erros

## 🌍 Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1

# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT (futuro)
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
```

## 📚 Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Criar modelos do banco de dados
- [ ] Implementar CRUD de usuários
- [ ] Implementar sistema de conversas
- [ ] Integrar com serviço de IA
- [ ] Adicionar testes unitários
- [ ] Adicionar documentação Swagger/OpenAPI

## 🤝 Convenções de Código

- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes e tipos
- Sempre adicione comentários descritivos
- Mantenha funções pequenas e focadas
- Siga os princípios SOLID
- Escreva código testável

## 📖 Documentação Adicional

### Guias de Setup:
- **[SETUP-UPSTASH-REDIS.md](SETUP-UPSTASH-REDIS.md)** - Como configurar Redis em produção com Upstash
- **[GUIA-BACKGROUND-JOBS.md](GUIA-BACKGROUND-JOBS.md)** - Sistema de filas com Bull/Redis

### Tecnologias:
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Supabase](https://supabase.com/docs)
- [Zod](https://zod.dev/)
- [Bull](https://github.com/OptimalBits/bull) - Sistema de filas
- [Upstash](https://upstash.com/) - Redis serverless

---

Desenvolvido com ❤️ para educação
