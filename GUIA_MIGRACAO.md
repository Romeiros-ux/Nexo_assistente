# 🚀 GUIA DE MIGRAÇÃO - Lovable → Infraestrutura Própria

**Data de Criação:** 28 de Janeiro de 2026  
**Objetivo:** Migrar sistema do Lovable Cloud para Render + Vercel mantendo 100% da funcionalidade

---

## 📋 ÍNDICE

1. [Visão Geral da Migração](#visão-geral)
2. [Checklist Pré-Migração](#checklist-pré-migração)
3. [Passo 1: Preparação Local](#passo-1-preparação-local)
4. [Passo 2: Obter Credenciais](#passo-2-obter-credenciais)
5. [Passo 3: Deploy Backend (Render)](#passo-3-deploy-backend-render)
6. [Passo 4: Deploy Frontend (Vercel)](#passo-4-deploy-frontend-vercel)
7. [Passo 5: Testes Finais](#passo-5-testes-finais)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 VISÃO GERAL

### O que vai mudar:

| Componente | ANTES (Lovable) | DEPOIS (Próprio) |
|------------|-----------------|------------------|
| **Frontend** | Lovable Cloud | Vercel (grátis) |
| **Backend** | Edge Functions | Render ($7/mês) |
| **Banco de Dados** | Supabase ✅ | Supabase ✅ (mesmo) |
| **IA** | LOVABLE_API_KEY | OpenAI API (~$3/mês) |
| **Controle** | Limitado ❌ | Total ✅ |

### O que NÃO vai mudar:

- ✅ Banco de dados (Supabase)
- ✅ Estrutura de tabelas
- ✅ Documentos e embeddings
- ✅ Usuários cadastrados
- ✅ Funcionalidades do sistema

---

## ✅ CHECKLIST PRÉ-MIGRAÇÃO

Antes de começar, certifique-se de ter:

- [ ] **Acesso ao Supabase Dashboard** (onde está o banco de dados)
- [ ] **Código local atualizado** (git pull origin main)
- [ ] **Conta GitHub ativa** (onde está o código)
- [ ] **Cartão de crédito** (para OpenAI - mínimo $5)
- [ ] **Tempo disponível** (2-3 horas sem interrupção)

---

## 📝 PASSO 1: PREPARAÇÃO LOCAL

### 1.1 Verificar arquivo render.yaml

```powershell
# Verificar se o arquivo existe
ls render.yaml

# Deve mostrar: render.yaml criado
```

✅ **Checkpoint:** Arquivo `render.yaml` existe na raiz do projeto

### 1.2 Commit das alterações

```powershell
# Ver status
git status

# Adicionar arquivo render.yaml
git add render.yaml

# Commit
git commit -m "feat: adicionar configuração de deploy Render"

# Push para GitHub
git push origin main
```

✅ **Checkpoint:** Código commitado e no GitHub

---

## 🔑 PASSO 2: OBTER CREDENCIAIS

### 2.1 Credenciais do Supabase

**Você JÁ TEM essas credenciais no Lovable. Agora precisa copiá-las:**

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Faça login com sua conta

2. **Selecione seu projeto**

3. **Vá em Settings → API:**
   - Copie **Project URL** → `SUPABASE_URL`
   - Copie **anon public** → `SUPABASE_ANON_KEY`
   - Copie **service_role** (⚠️ clique em "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

4. **Vá em Settings → Database:**
   - Copie **Password** → `DATABASE_PASSWORD`

📋 **Anote em um arquivo temporário:**

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (⚠️ NÃO compartilhe!)
DATABASE_PASSWORD=sua-senha-aqui
```

✅ **Checkpoint:** 4 credenciais do Supabase copiadas

---

### 2.2 Criar Conta OpenAI e Obter API Key

**⚠️ IMPORTANTE:** Você vai precisar adicionar créditos ($5-10 mínimo)

1. **Acesse:** https://platform.openai.com

2. **Crie uma conta** ou faça login

3. **Adicione créditos:**
   - Vá em **Billing** → **Add payment method**
   - Adicione cartão de crédito
   - Compre créditos: **$5 ou $10** (recomendo $10)
   - **Custo real:** ~$1-3/mês, mas precisa ter crédito disponível

4. **Crie API Key:**
   - Vá em **API Keys**
   - Clique em **Create new secret key**
   - Nome: "Nexo Assistente"
   - Copie a chave (começa com `sk-proj-...`)
   - ⚠️ **Salve agora!** Não conseguirá ver depois

📋 **Anote:**

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

✅ **Checkpoint:** Conta OpenAI criada, $5-10 de crédito adicionado, API Key gerada

---

### 2.3 Gerar JWT Secret

```powershell
# Opção 1: Online
# Acesse: https://generate-secret.vercel.app/64
# Copie o valor gerado

# Opção 2: Terminal (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

📋 **Anote:**

```
JWT_SECRET=a1b2c3d4e5f6... (64 caracteres)
```

✅ **Checkpoint:** JWT_SECRET gerado

---

## 🌐 PASSO 3: DEPLOY BACKEND (RENDER)

### 3.1 Criar Conta no Render

1. **Acesse:** https://render.com
2. **Sign Up** com GitHub (recomendado)
3. Autorize acesso aos repositórios

✅ **Checkpoint:** Conta Render criada

---

### 3.2 Criar Novo Web Service

1. **No Render Dashboard:**
   - Clique em **"New"** → **"Blueprint"**

2. **Conectar Repositório:**
   - Selecione o repositório: `Nexo_assistente`
   - Clique em **"Connect"**

3. **Render vai detectar o arquivo `render.yaml`:**
   - Você verá uma prévia do serviço
   - Nome: `nexo-assistente-backend`
   - Plan: Free
   - Clique em **"Apply"**

✅ **Checkpoint:** Blueprint aplicado, serviço criado

---

### 3.3 Configurar Variáveis de Ambiente (Secrets)

**⚠️ PASSO CRÍTICO!**

O primeiro deploy vai FALHAR (esperado). Agora vamos adicionar os secrets:

1. **Clique no serviço criado:** `nexo-assistente-backend`

2. **Vá em "Environment"** no menu lateral

3. **Adicione CADA secret manualmente:**

Clique em **"Add Environment Variable"** para cada um:

| Key | Value | Onde está |
|-----|-------|-----------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Anotações passo 2.1 |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` | Anotações passo 2.1 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Anotações passo 2.1 |
| `DATABASE_PASSWORD` | Sua senha do banco | Anotações passo 2.1 |
| `OPENAI_API_KEY` | `sk-proj-...` | Anotações passo 2.2 |
| `JWT_SECRET` | `a1b2c3d4...` | Anotações passo 2.3 |

4. **Clique em "Save Changes"**

5. **O Render vai reiniciar o deploy automaticamente**

6. **Aguarde 3-5 minutos** (acompanhe nos Logs)

✅ **Checkpoint:** Secrets configurados, deploy em andamento

---

### 3.4 Verificar Deploy Bem-Sucedido

1. **Vá na aba "Logs"**

2. **Procure por:**
   ```
   ✅ Servidor rodando no ambiente: production
   ✅ Porta: 10000
   ```

3. **Status deve estar:** 🟢 **Live**

4. **Copie a URL do serviço:**
   - Exemplo: `https://nexo-assistente-backend.onrender.com`

✅ **Checkpoint:** Backend deployado com sucesso

---

### 3.5 Testar Backend

```powershell
# Substituir pela SUA URL do Render
$backend_url = "https://nexo-assistente-backend.onrender.com"

# Testar root
Invoke-RestMethod -Uri "$backend_url/" -Method Get

# Testar health check
Invoke-RestMethod -Uri "$backend_url/health" -Method Get

# Testar API info
Invoke-RestMethod -Uri "$backend_url/api/v1" -Method Get
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "API está funcionando",
  "timestamp": "2026-01-28T..."
}
```

✅ **Checkpoint:** Backend funcionando no Render

---

## 🎨 PASSO 4: DEPLOY FRONTEND (VERCEL)

### 4.1 Criar Conta no Vercel

1. **Acesse:** https://vercel.com
2. **Sign Up** com GitHub
3. Autorize acesso aos repositórios

✅ **Checkpoint:** Conta Vercel criada

---

### 4.2 Importar Projeto

1. **No Vercel Dashboard:**
   - Clique em **"Add New..."** → **"Project"**

2. **Import Git Repository:**
   - Encontre `Nexo_assistente`
   - Clique em **"Import"**

3. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (raiz)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables:**

Clique em **"Environment Variables"** e adicione:

| Key | Value | Onde está |
|-----|-------|-----------|
| `VITE_API_URL` | `https://nexo-assistente-backend.onrender.com/api/v1` | URL do Render + `/api/v1` |

5. **Clique em "Deploy"**

6. **Aguarde 2-3 minutos**

✅ **Checkpoint:** Frontend deployado com sucesso

---

### 4.3 Atualizar CORS no Backend

**⚠️ IMPORTANTE:** Agora que você tem a URL do frontend, precisa configurar o CORS:

1. **Copie a URL do Vercel:**
   - Exemplo: `https://nexo-assistente.vercel.app`

2. **Volte ao Render Dashboard**

3. **Acesse o serviço backend → Environment**

4. **Encontre a variável `ALLOWED_ORIGINS`**

5. **Atualize o valor:**
   ```
   https://nexo-assistente.vercel.app
   ```
   (Substitua pela SUA URL do Vercel)

6. **Save Changes** (vai reiniciar o backend)

✅ **Checkpoint:** CORS configurado

---

## 🧪 PASSO 5: TESTES FINAIS

### 5.1 Teste de Login

1. **Acesse a URL do Vercel** (frontend)
2. **Faça login** com suas credenciais
3. **Deve funcionar normalmente**

✅ **Teste:** Login funcionando

---

### 5.2 Teste de Chat

1. **Vá para a página de Chat**
2. **Faça uma pergunta:**
   - "Qual é o IDEB de Saquarema em 2023?"
3. **Deve retornar resposta com citações**

✅ **Teste:** Chat funcionando

---

### 5.3 Teste de Upload (se tiver acesso TI)

1. **Vá para Upload de Documentos**
2. **Faça upload de um PDF teste**
3. **Deve processar com sucesso**

✅ **Teste:** Upload funcionando

---

## ✅ MIGRAÇÃO COMPLETA!

### 🎉 Parabéns! Você migrou com sucesso!

**Novo Setup:**
- ✅ Frontend: Vercel (grátis)
- ✅ Backend: Render ($7/mês ou grátis para testar)
- ✅ Banco: Supabase (mesmo de antes)
- ✅ IA: OpenAI (~$1-3/mês)

**Custos mensais:** ~$8-10/mês

---

## 🆘 TROUBLESHOOTING

### Backend não inicia no Render

**Sintoma:** Logs mostram erro ao iniciar

**Verificar:**
1. Todos os secrets foram adicionados?
2. OPENAI_API_KEY está correta? (começa com `sk-proj-`)
3. SUPABASE_URL está correta? (começa com `https://`)

**Solução:**
- Re-verificar cada secret no Environment
- Ver logs completos: aba "Logs"

---

### Frontend não conecta ao backend

**Sintoma:** Erro de CORS ou "Network Error"

**Verificar:**
1. `VITE_API_URL` está correta no Vercel?
2. `ALLOWED_ORIGINS` está configurado no Render?

**Solução:**
```
Backend (Render Environment):
ALLOWED_ORIGINS=https://sua-url-frontend.vercel.app

Frontend (Vercel Environment):
VITE_API_URL=https://sua-url-backend.onrender.com/api/v1
```

---

### OpenAI retorna erro 429 (rate limit)

**Sintoma:** Chat funciona mas retorna "Too many requests"

**Verificar:**
1. Tem crédito disponível na conta OpenAI?
2. API key está ativa?

**Solução:**
- Adicionar mais créditos em platform.openai.com/billing

---

### Deploy do backend muito lento

**Sintoma:** Render leva 10+ minutos para deploy

**Causa:** Plano free tem menos recursos

**Solução:**
- Aguardar (primeira vez é mais lento)
- Ou: Mudar para plano Starter ($7/mês)

---

## 📞 SUPORTE

Se precisar de ajuda:
1. Verificar este guia novamente
2. Ver logs no Render e Vercel
3. Consultar documentação oficial

---

**Última atualização:** 28 de Janeiro de 2026
