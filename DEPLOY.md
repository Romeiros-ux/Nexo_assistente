# 🚀 Guia de Deploy - Assistente Institucional Inteligente

> **Status**: Backend pronto para produção | Frontend 60% completo
> 
> **Última atualização**: 9 de Janeiro de 2026

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Deploy do Backend (Render)](#deploy-do-backend-render)
3. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
4. [Validação Pós-Deploy](#validação-pós-deploy)
5. [Deploy do Frontend](#deploy-do-frontend)
6. [Troubleshooting](#troubleshooting)
7. [Monitoramento](#monitoramento)
8. [Custos](#custos)

---

## 🔧 Pré-requisitos

### Contas Necessárias

- ✅ **GitHub**: Repositório com o código
- ✅ **Render**: Para hospedar o backend ([render.com](https://render.com))
- ✅ **Supabase**: Banco de dados já configurado
- ⬜ **Vercel/Netlify**: Para hospedar o frontend (quando estiver pronto)

### Informações que Você Precisará

Antes de começar, tenha em mãos:

1. **Credenciais do Supabase**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_PASSWORD`

2. **JWT Secret** (gere um novo):
   - Acesse: https://generate-secret.vercel.app/64
   - Copie o token gerado (64 caracteres)

3. **URL do Frontend** (quando disponível):
   - Para configurar o CORS

---

## 🌐 Deploy do Backend (Render)

### Passo 1: Preparar o Repositório

```bash
# 1. Certifique-se de que todas as alterações estão commitadas
git status

# 2. Commit se houver alterações pendentes
git add .
git commit -m "feat: adicionar configuração de deploy para Render"

# 3. Faça push para o GitHub
git push origin main
```

### Passo 2: Criar Serviço no Render

1. **Acesse o Render Dashboard**:
   - Vá para [dashboard.render.com](https://dashboard.render.com)
   - Faça login com sua conta

2. **Novo Blueprint**:
   - Clique em **"New"** → **"Blueprint"**
   - Ou acesse diretamente: https://dashboard.render.com/select-repo?type=blueprint

3. **Conectar Repositório**:
   - Selecione **"Connect GitHub"** (se ainda não conectou)
   - Autorize o Render a acessar seus repositórios
   - Selecione o repositório: `edu-ia-assistente`

4. **Detectar Blueprint**:
   - O Render detectará automaticamente o arquivo `render.yaml`
   - Você verá uma prévia do serviço que será criado:
     ```
     Service: edu-ia-assistente-backend
     Type: Web Service
     Runtime: Node.js 20.0.0
     Region: Oregon
     Plan: Free
     ```

5. **Configurar Nome do Blueprint**:
   - Blueprint Name: `edu-ia-assistente`
   - Clique em **"Apply"**

### Passo 3: Aguardar Criação Inicial

O Render irá:
- ✅ Criar o web service
- ✅ Fazer o primeiro build
- ⚠️ **FALHAR** na primeira tentativa (variáveis secretas ausentes)

**Isso é esperado!** Vamos configurar as variáveis secretas no próximo passo.

---

## 🔐 Configuração de Variáveis de Ambiente

### Passo 1: Acessar Configurações do Serviço

1. No Render Dashboard, clique no serviço criado: **`edu-ia-assistente-backend`**
2. Vá para a aba **"Environment"** no menu lateral

### Passo 2: Adicionar Variáveis Secretas

Você verá que algumas variáveis já estão configuradas pelo `render.yaml`. Agora vamos adicionar os **valores reais** para as variáveis marcadas como `sync: false`:

#### Supabase

Clique em **"Add Environment Variable"** para cada uma:

| Key | Value | Como obter |
|-----|-------|------------|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase Dashboard → Settings → API → Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase Dashboard → Settings → API → Service Role → `service_role` `secret` ⚠️ |
| `DATABASE_PASSWORD` | `sua-senha-do-banco` | Supabase Dashboard → Settings → Database → Password |

⚠️ **ATENÇÃO**: O `SUPABASE_SERVICE_ROLE_KEY` é extremamente sensível! Nunca exponha em logs ou frontend.

#### JWT Secret

| Key | Value | Como obter |
|-----|-------|------------|
| `JWT_SECRET` | `(64 caracteres aleatórios)` | Gere em: https://generate-secret.vercel.app/64 |

**Exemplo de JWT_SECRET**:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Passo 3: Salvar e Redeploy

1. Clique em **"Save Changes"**
2. O Render iniciará automaticamente um novo deploy
3. Aguarde o build completar (3-5 minutos)

---

## ✅ Validação Pós-Deploy

### Passo 1: Verificar Status do Deploy

No Render Dashboard:

1. Vá para a aba **"Logs"**
2. Você deve ver:
   ```
   🚀 Iniciando servidor...
   📡 Testando conexão com Supabase...
   ✅ Conexão com Supabase estabelecida
   ✅ Servidor rodando no ambiente: production
   ✅ Porta: 10000
   ```

3. Status deve estar: **🟢 Live**

### Passo 2: Testar Endpoints

Sua URL será algo como: `https://edu-ia-assistente-backend.onrender.com`

#### 1. Testar Root (/)

```bash
curl https://edu-ia-assistente-backend.onrender.com/
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Assistente Institucional Inteligente - API",
  "version": "1.0.0",
  "apiPrefix": "/api/v1",
  "documentation": "/api/v1/docs"
}
```

#### 2. Testar Health Check

```bash
curl https://edu-ia-assistente-backend.onrender.com/api/v1/health
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "API está funcionando",
  "timestamp": "2026-01-09T20:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

#### 3. Testar Health Detailed

```bash
curl https://edu-ia-assistente-backend.onrender.com/api/v1/health/detailed
```

**Resposta esperada**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-09T20:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "database": {
    "status": "connected",
    "provider": "supabase",
    "responseTime": 45
  },
  "memory": {
    "used": 52.5,
    "total": 512,
    "percentage": 10.25
  },
  "cpu": {
    "usage": 15.3
  }
}
```

#### 4. Testar Lista de Rotas

```bash
curl https://edu-ia-assistente-backend.onrender.com/api/v1
```

**Resposta esperada**: Lista de todas as rotas disponíveis

### Passo 3: Testar Via Navegador

Abra no navegador:

```
https://edu-ia-assistente-backend.onrender.com/api/v1/health
```

Deve aparecer o JSON do health check.

---

## 🎨 Deploy do Frontend

> ⚠️ **Nota**: O frontend está 60% completo. Estas instruções serão úteis quando estiver pronto.

### Opção 1: Vercel (Recomendado para Next.js/React)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

### Opção 2: Netlify

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
netlify deploy --prod
```

### Configurar Variáveis de Ambiente no Frontend

Após o deploy, configure:

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://edu-ia-assistente-backend.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | (mesmo do backend) |
| `VITE_SUPABASE_ANON_KEY` | (mesmo do backend) |

### Atualizar CORS no Backend

Após deploy do frontend:

1. Acesse Render Dashboard → `edu-ia-assistente-backend` → Environment
2. Edite a variável `ALLOWED_ORIGINS`
3. Adicione a URL real do frontend:
   ```
   https://seu-frontend.vercel.app,https://www.seu-dominio.com.br
   ```
4. Save Changes (redeploy automático)

---

## 🔧 Troubleshooting

### Problema: Build Falha no Render

**Sintomas**: Deploy falha na fase de build

**Causas Comuns**:
1. Erro de compilação TypeScript
2. Dependências ausentes
3. Versão do Node incorreta

**Solução**:
```bash
# Testar build localmente primeiro
cd backend
npm run build

# Verificar se dist/ foi criado
ls dist/

# Verificar versão do Node (deve ser 20.x)
node --version
```

### Problema: Servidor Inicia mas Health Check Falha

**Sintomas**: Logs mostram servidor rodando, mas health check retorna erro

**Causas Comuns**:
1. Health check path incorreto
2. Porta incorreta
3. Timeout muito curto

**Solução**:
1. Verifique no `render.yaml`:
   ```yaml
   healthCheckPath: /api/v1/health  # Deve incluir /api/v1
   ```

2. Teste manualmente:
   ```bash
   curl https://seu-app.onrender.com/api/v1/health
   ```

### Problema: Erro de Conexão com Supabase

**Sintomas**: Logs mostram erro ao conectar com Supabase

**Causas Comuns**:
1. `SUPABASE_URL` incorreto
2. `SUPABASE_ANON_KEY` incorreto
3. Projeto Supabase pausado

**Solução**:
1. Verifique as variáveis no Render Dashboard
2. Teste conexão diretamente:
   ```bash
   curl https://seu-projeto.supabase.co/rest/v1/
   ```

3. Verifique se o projeto Supabase está ativo:
   - Acesse Supabase Dashboard
   - Projeto deve estar **Active** (não Paused)

### Problema: CORS Error no Frontend

**Sintomas**: Frontend mostra erro `blocked by CORS policy`

**Causas Comuns**:
1. URL do frontend não está em `ALLOWED_ORIGINS`
2. CORS headers incorretos

**Solução**:
1. Adicione URL do frontend em `ALLOWED_ORIGINS`:
   ```
   https://seu-frontend.vercel.app,https://www.seu-dominio.com
   ```

2. Certifique-se de incluir ambos:
   - URL com `www`
   - URL sem `www`

### Problema: Plano Free Entra em Sleep

**Sintomas**: Primeira requisição após inatividade demora 30-60 segundos

**Causa**: Plano Free do Render dorme após 15 minutos de inatividade

**Soluções**:

**Opção 1: Upgrade para Starter ($7/mês)**
- Servidor sempre ativo
- Sem cold starts

**Opção 2: Keep-Alive Service (Grátis)**

Configure um cron job para fazer ping a cada 10 minutos:

```bash
# Usar cron-job.org ou similar
# URL: https://seu-app.onrender.com/api/v1/health
# Intervalo: */10 * * * * (a cada 10 minutos)
```

**Opção 3: Aceitar o Trade-off**
- Para MVP/desenvolvimento, o plano Free é suficiente
- Usuários terão 30s de delay na primeira requisição
- Requisições subsequentes são rápidas

---

## 📊 Monitoramento

### Render Built-in Metrics

O Render oferece métricas básicas:

1. **Acesse**: Dashboard → Serviço → Metrics
2. **Métricas disponíveis**:
   - CPU Usage
   - Memory Usage
   - Request Count
   - Response Time
   - Error Rate

### Configurar Alertas (Opcional)

**Opção 1: Render Notifications**
- Dashboard → Service → Settings → Notifications
- Configure e-mail para deploy failures

**Opção 2: Sentry (Recomendado para Produção)**

```bash
# Instalar Sentry SDK
npm install @sentry/node

# Configurar em src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**Opção 3: DataDog/New Relic**
- Para aplicações enterprise
- Monitoramento avançado de performance

### Logs

**Acessar logs em tempo real**:
```bash
# Via Render Dashboard
Dashboard → Service → Logs

# Via Render CLI (opcional)
npm install -g render-cli
render login
render logs edu-ia-assistente-backend --follow
```

**Níveis de log configurados**:
- `LOG_LEVEL=info` (padrão) - Requisições HTTP + erros
- `LOG_LEVEL=debug` - Inclui queries SQL + detalhes
- `LOG_LEVEL=error` - Apenas erros

---

## 💰 Custos

### Render - Backend Hosting

#### Plano Free (Atual)
- **Custo**: $0/mês
- **Recursos**:
  - 750 horas/mês (suficiente para 1 serviço 24/7)
  - 512MB RAM
  - Sleeps após 15min de inatividade
  - Compartilha CPU
- **Limitações**:
  - Cold start de ~30s
  - Pode ser lento em picos
  - Build time limitado (15min)
- **Ideal para**: MVP, desenvolvimento, demos

#### Plano Starter (Recomendado para Produção)
- **Custo**: $7/mês
- **Recursos**:
  - Always-on (sem sleep)
  - 512MB RAM
  - CPU dedicado
  - Build time ilimitado
- **Vantagens**:
  - Sem cold starts
  - Performance consistente
  - Melhor para produção
- **Ideal para**: Produção, aplicações com usuários reais

#### Plano Standard
- **Custo**: $25/mês
- **Recursos**:
  - 2GB RAM
  - CPU dedicado
  - Auto-scaling
- **Ideal para**: Aplicações com alto tráfego

### Supabase - Database

#### Plano Free (Atual)
- **Custo**: $0/mês
- **Recursos**:
  - 500MB database
  - 1GB file storage
  - 50MB bandwidth/dia
  - Projetos pausam após 1 semana de inatividade
- **Ideal para**: Desenvolvimento, MVPs

#### Plano Pro
- **Custo**: $25/mês
- **Recursos**:
  - 8GB database
  - 100GB file storage
  - Sem pausa automática
- **Ideal para**: Produção

### Frontend (Vercel/Netlify)

Ambos oferecem plano Free generoso:
- **Custo**: $0/mês
- **Limites**: 100GB bandwidth/mês
- **Suficiente para**: Aplicações pequenas/médias

### Total Estimado

| Ambiente | Backend | Database | Frontend | **Total/mês** |
|----------|---------|----------|----------|---------------|
| **Desenvolvimento** | $0 (Free) | $0 (Free) | $0 (Free) | **$0** |
| **MVP/Beta** | $7 (Starter) | $0 (Free) | $0 (Free) | **$7** |
| **Produção Small** | $7 (Starter) | $25 (Pro) | $0 (Free) | **$32** |
| **Produção Medium** | $25 (Standard) | $25 (Pro) | $20 (Vercel Pro) | **$70** |

---

## 🎯 Checklist Final de Deploy

Antes de considerar o deploy completo, verifique:

### Backend ✅

- [x] `render.yaml` criado e versionado
- [x] Variáveis de ambiente configuradas no Render
- [x] Health checks passando
- [x] Conexão com Supabase funcionando
- [x] Endpoints principais testados
- [x] Logs sem erros críticos

### Frontend ⬜ (Pendente)

- [ ] Build de produção testado
- [ ] Variáveis de ambiente configuradas
- [ ] API_URL apontando para backend em produção
- [ ] CORS configurado no backend
- [ ] Rotas principais funcionando

### Database ✅

- [x] Supabase configurado
- [x] Tabelas criadas (10 tabelas)
- [x] RLS policies ativas (30+ policies)
- [x] Dados de seed (se aplicável)
- [x] Backups configurados

### Segurança ✅

- [x] Variáveis secretas não commitadas no Git
- [x] JWT_SECRET gerado com 64 caracteres
- [x] CORS restrito às origens permitidas
- [x] Helmet configurado (headers de segurança)
- [x] RLS ativo no Supabase

---

## 📚 Recursos Adicionais

### Documentação Oficial

- [Render Docs](https://render.com/docs)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Supabase Docs](https://supabase.com/docs)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### Ferramentas Úteis

- [JWT Secret Generator](https://generate-secret.vercel.app/64)
- [Render Status Page](https://status.render.com/)
- [Supabase Status](https://status.supabase.com/)

### Suporte

- Render Support: support@render.com
- Supabase Discord: https://discord.supabase.com
- Documentação do Projeto: `backend/README_INTEGRATION.md`

---

## 🎉 Próximos Passos

Após o deploy do backend:

1. **Finalizar Frontend** (60% → 100%)
   - Completar páginas pendentes
   - Integrar com API em produção
   - Testes end-to-end

2. **Deploy do Frontend**
   - Vercel ou Netlify
   - Configurar domínio custom

3. **Testes de Integração**
   - Fluxos completos usuário-servidor-banco
   - Performance testing
   - Security audit

4. **Documentação para Usuários**
   - Manual do sistema
   - Guia de uso da IA
   - FAQs

5. **Monitoramento em Produção**
   - Configurar Sentry
   - Alertas de erros
   - Analytics de uso

---

**🚀 Backend Deploy Status: READY**  
**📅 Data**: 9 de Janeiro de 2026  
**👤 Responsável**: Sistema preparado para deploy  
**📍 Próxima Revisão**: Após primeiro deploy em produção
