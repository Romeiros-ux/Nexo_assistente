# ✅ Checklist de Deploy - Nexo Assistente

## 📦 Preparação Local (Concluído)

- [x] Vite configurado para usar PORT do ambiente
- [x] .gitignore atualizado com proteção para .env
- [x] render.yaml criado
- [x] README.md atualizado com documentação completa
- [x] DEPLOY_RENDER.md criado com guia passo-a-passo
- [x] .env.example criado para referência
- [x] Build testado e funcionando localmente

## 🚀 Deploy no Render (Próximos Passos)

### 1. Preparar Repositório GitHub
- [ ] Fazer commit das alterações:
  ```bash
  git add .
  git commit -m "feat: configurações para deploy no Render"
  git push origin main
  ```
- [ ] Verificar se .env não foi commitado (deve aparecer apenas .env.example)

### 2. Criar Serviço no Render
- [ ] Acessar [render.com](https://render.com)
- [ ] Criar conta ou fazer login
- [ ] Clicar em "New +" → "Web Service"
- [ ] Conectar conta do GitHub
- [ ] Selecionar repositório `Nexo_assistente`
- [ ] O Render deve detectar automaticamente o `render.yaml`

### 3. Configurar Variáveis de Ambiente
- [ ] No painel do Render, ir em "Environment"
- [ ] Adicionar variáveis:
  - [ ] `NODE_VERSION` = `18.19.0`
  - [ ] `VITE_SUPABASE_URL` = `https://bkssobleshobcwnnipak.supabase.co`
  - [ ] `VITE_SUPABASE_PROJECT_ID` = `bkssobleshobcwnnipak`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = (copiar do .env local)

### 4. Iniciar Deploy
- [ ] Clicar em "Create Web Service"
- [ ] Aguardar build (3-5 minutos)
- [ ] Copiar URL fornecida pelo Render (ex: `https://nexo-assistente.onrender.com`)

### 5. Configurar Supabase
- [ ] Acessar [Supabase Dashboard](https://supabase.com/dashboard/project/bkssobleshobcwnnipak)
- [ ] Ir em **Authentication** → **URL Configuration**
- [ ] Adicionar URL do Render em:
  - [ ] Site URL
  - [ ] Redirect URLs
- [ ] Salvar alterações

### 6. Verificar Edge Functions
- [ ] No Supabase Dashboard → **Edge Functions**
- [ ] Verificar se `LOVABLE_API_KEY` está configurada
- [ ] Se não estiver, configurar via CLI ou dashboard

### 7. Testes Pós-Deploy
- [ ] Acessar URL do Render
- [ ] Verificar se página carrega corretamente
- [ ] Testar login com usuário existente
- [ ] Testar funcionalidade do chat
- [ ] Verificar upload de documentos (se TI)
- [ ] Checar console do navegador para erros (F12)

## 🔧 Troubleshooting

### Build Falha
- [ ] Verificar logs no Render Dashboard
- [ ] Confirmar que todas as variáveis de ambiente foram adicionadas
- [ ] Verificar se não há erros de sintaxe no código

### Página em Branco
- [ ] Abrir console do navegador (F12)
- [ ] Verificar se variáveis `VITE_*` estão definidas
- [ ] Confirmar CORS no Supabase

### Login Não Funciona
- [ ] Verificar se URL do Render está nas configurações do Supabase
- [ ] Testar com usuário de teste
- [ ] Verificar logs de autenticação no Supabase

### Chat Não Responde
- [ ] Verificar `LOVABLE_API_KEY` nas Edge Functions
- [ ] Testar Edge Function diretamente no Supabase Dashboard
- [ ] Verificar logs das Edge Functions

## 📊 Pós-Deploy

### Monitoramento
- [ ] Configurar alertas no Render (opcional)
- [ ] Monitorar uso de créditos Lovable AI
- [ ] Verificar performance das Edge Functions

### Otimizações (Opcional)
- [ ] Considerar upgrade do plano Free → Starter ($7/mês)
- [ ] Configurar domínio customizado
- [ ] Implementar cache de respostas frequentes
- [ ] Adicionar analytics (Google Analytics, Plausible, etc.)

## 📝 Notas Importantes

1. **Plano Free do Render**: Hiberna após 15 min de inatividade. Primeiro acesso pode ser lento (cold start ~30s).

2. **Variáveis de Ambiente**: São compiladas no build. Se mudar variáveis, precisa fazer rebuild.

3. **Supabase Edge Functions**: São independentes do deploy do frontend. Já estão hospedadas no Supabase.

4. **Segurança**: O arquivo .env NUNCA deve ser commitado. Sempre use .env.example para documentação.

5. **CORS**: Crucial para autenticação funcionar. Não esqueça de adicionar URL do Render no Supabase.

## 🆘 Suporte

- [Documentação do Render](https://render.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [Guia Completo de Deploy](./DEPLOY_RENDER.md)

---

**Última atualização:** 26 de janeiro de 2026
