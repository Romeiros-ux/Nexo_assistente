# 🚀 Deploy no Render - Guia Rápido

## ✅ Pré-requisitos Concluídos

Os seguintes ajustes já foram feitos no projeto:

- ✅ Vite configurado para usar variável PORT do ambiente
- ✅ .gitignore atualizado para proteger .env
- ✅ render.yaml criado com configurações de deploy
- ✅ Scripts de build já estão configurados no package.json

## 📋 Passos para Deploy no Render

### 1. Criar Conta e Conectar Repositório

1. Acesse [render.com](https://render.com) e faça login/cadastro
2. Clique em **"New +"** → **"Web Service"**
3. Conecte sua conta do GitHub
4. Selecione o repositório `Nexo_assistente`

### 2. Configurar o Serviço

O Render deve detectar automaticamente o arquivo `render.yaml`. Se não:

**Configurações Manuais:**
- **Name:** nexo-assistente
- **Environment:** Node
- **Region:** Oregon (ou outra de sua preferência)
- **Branch:** main (ou o nome da sua branch principal)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run preview -- --port $PORT --host 0.0.0.0`

### 3. Adicionar Variáveis de Ambiente

No painel do Render, vá em **Environment** e adicione:

```
NODE_VERSION = 18.19.0
VITE_SUPABASE_URL = https://bkssobleshobcwnnipak.supabase.co
VITE_SUPABASE_PROJECT_ID = bkssobleshobcwnnipak
VITE_SUPABASE_PUBLISHABLE_KEY = [Copie do arquivo .env]
```

> ⚠️ **IMPORTANTE:** A chave `VITE_SUPABASE_PUBLISHABLE_KEY` está no seu arquivo `.env` local. Copie o valor completo.

### 4. Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (pode levar 3-5 minutos)
3. O Render fornecerá uma URL como: `https://nexo-assistente.onrender.com`

### 5. Configurar CORS no Supabase

1. Acesse [supabase.com](https://supabase.com/dashboard)
2. Vá no projeto `bkssobleshobcwnnipak`
3. **Authentication** → **URL Configuration**
4. Adicione a URL do Render em **Site URL** e **Redirect URLs**:
   ```
   https://nexo-assistente.onrender.com
   ```

### 6. Testar Edge Functions

Verifique se as variáveis de ambiente das Edge Functions estão configuradas:

1. No Supabase Dashboard → **Edge Functions**
2. Verifique se `LOVABLE_API_KEY` está configurada
3. Se necessário, configure via CLI:
   ```bash
   supabase secrets set LOVABLE_API_KEY=sua_chave_aqui
   ```

## 🔧 Troubleshooting

### Build Falha
- Verifique os logs no Render
- Certifique-se que todas as variáveis de ambiente foram adicionadas
- Teste localmente: `npm run build`

### Página em Branco
- Abra o console do navegador (F12)
- Verifique se as variáveis `VITE_*` estão corretas
- Confirme que o CORS está configurado no Supabase

### Autenticação Não Funciona
- Verifique se a URL do Render está nas configurações de autenticação do Supabase
- Teste com usuário existente primeiro

### Chat Não Responde
- Verifique se `LOVABLE_API_KEY` está configurada nas Edge Functions
- Teste as Edge Functions diretamente via Supabase Dashboard

## 📊 Monitoramento

Após o deploy, monitore:
- **Logs do Render:** Dashboard → Logs
- **Logs do Supabase:** Dashboard → Logs
- **Performance:** Tempo de resposta do chat

## 🎯 Próximos Passos (Opcional)

- [ ] Configurar domínio customizado no Render
- [ ] Configurar certificado SSL (automático no Render)
- [ ] Implementar CI/CD automático (já funciona via GitHub)
- [ ] Monitorar uso de créditos da API Lovable
- [ ] Configurar backups do Supabase

## 💡 Dicas

1. **Plano Free do Render:** O serviço hiberna após 15 minutos de inatividade. O primeiro acesso pode ser lento.
2. **Upgrade:** Para melhor performance, considere o plano Starter ($7/mês).
3. **Cache:** O Render faz cache de builds. Para forçar rebuild completo, use "Clear build cache & deploy".

## 🔗 Links Úteis

- [Documentação do Render](https://render.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard/project/bkssobleshobcwnnipak)
- [Documentação Supabase](https://supabase.com/docs)

---

**Precisa de ajuda?** Entre em contato com o suporte do Render ou consulte os logs para diagnóstico.
