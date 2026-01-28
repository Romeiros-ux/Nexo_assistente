# 🚀 Guia Completo: Configurar Upstash Redis para Produção

## 📋 O que é Upstash?

Upstash é um serviço de Redis **serverless** perfeito para produção:
- ✅ **Free tier**: 10.000 comandos/dia (suficiente para começar)
- ✅ **Pay-as-you-go**: Paga apenas pelo uso
- ✅ **TLS nativo**: Segurança automática
- ✅ **Latência baixa**: Edge locations globais
- ✅ **REST API**: Alternativa ao protocolo Redis

---

## 🎯 Passo 1: Criar Conta no Upstash

### 1.1 Acessar o console:
```
https://console.upstash.com/
```

### 1.2 Fazer login:
- **Opção 1**: GitHub (mais rápido) ✅
- **Opção 2**: Google
- **Opção 3**: Email/senha

### 1.3 Verificar email (se necessário)

---

## 🗄️ Passo 2: Criar Redis Database

### 2.1 No Dashboard Upstash:

1. Clique em **"Create Database"** (botão verde)

2. Preencha o formulário:

```
┌─────────────────────────────────────┐
│ Name: edu-ia-queue                  │
│ Type: ● Regional  ○ Global          │
│ Primary Region: us-east-1           │
│ Read Regions: (deixe vazio)         │
│ TLS (SSL): ✅ Enabled               │
│ Eviction: allkeys-lru               │
└─────────────────────────────────────┘
```

**Explicação dos campos:**
- **Name**: Nome para identificar seu banco
- **Type**: Regional = mais barato, Global = menor latência mundial
- **Region**: us-east-1 está próximo do Render.com (Virginia)
- **TLS**: Sempre habilitado para segurança
- **Eviction**: allkeys-lru remove dados antigos quando memória enche

3. Clique em **"Create"**

4. Aguarde ~30 segundos

---

## 🔑 Passo 3: Copiar Credenciais

### 3.1 Na página do Database criado:

Clique na aba **"Details"**

Você verá algo assim:

```
┌──────────────────────────────────────────────────┐
│ Endpoint: touching-seahorse-12345.upstash.io     │
│ Port: 6379 (standard) ou 6380 (TLS)              │
│ Password: AXdyYWtkc2Zkc2ZAc2Zkc2Zk...            │
└──────────────────────────────────────────────────┘
```

### 3.2 Copiar Connection String:

Role até a seção **"Connect"** e copie a **"Redis URL"**:

#### Opção A: TLS URL (RECOMENDADO) 🔒
```bash
rediss://default:AXdyYWtkc2Zkc2ZAc2Zkc2Zk@touching-seahorse-12345.upstash.io:6380
```
> ⚠️ Note o duplo 's' em `rediss://` = TLS habilitado

#### Opção B: URL Padrão
```bash
redis://default:AXdyYWtkc2Zkc2ZAc2Zkc2Zk@touching-seahorse-12345.upstash.io:6379
```

---

## ⚙️ Passo 4: Configurar no Render.com

### 4.1 Acessar o Web Service no Render:

1. Vá em https://dashboard.render.com
2. Clique no seu Web Service (backend)
3. Vá na aba **"Environment"**

### 4.2 Adicionar variável de ambiente:

Clique em **"Add Environment Variable"**

```
Key: REDIS_URL
Value: rediss://default:AXdy...@touching-seahorse-12345.upstash.io:6380
```

> 💡 **Importante**: Cole a URL COMPLETA que você copiou do Upstash

### 4.3 Salvar:

1. Clique em **"Save Changes"**
2. O Render vai fazer **redeploy automático**

---

## ✅ Passo 5: Verificar se Funcionou

### 5.1 Aguardar deploy (~2-3 minutos)

### 5.2 Ver logs no Render:

Vá na aba **"Logs"** e procure por:

```
✅ Sucesso:
[IndexingQueue] Usando REDIS_URL: rediss://default:***@touching-seahorse-12345.upstash.io:6380
[IndexingQueue] Inicializado: { redis_url: 'rediss://default:***@...', queue_name: 'document-indexing' }
[IndexingProcessor] Processor iniciado com concorrência: 2
✅ Servidor rodando no ambiente: production
```

```
❌ Erro (Redis não conectou):
[IndexingQueue] ⚠️ Redis não disponível - Fila de indexação desabilitada
[IndexingProcessor] ⚠️ Fila não habilitada - Processor não será iniciado
```

---

## 🧪 Passo 6: Testar a Fila

### 6.1 Fazer upload de um documento no sistema

### 6.2 Ver estatísticas no Upstash:

No dashboard Upstash, vá em **"Data Browser"** e execute:

```redis
KEYS *
```

Você deve ver chaves como:
```
bull:document-indexing:1
bull:document-indexing:active
bull:document-indexing:wait
```

### 6.3 Ver comandos executados:

Na página do database, vá em **"Metrics"** para ver:
- Comandos por segundo
- Uso de memória
- Conexões ativas

---

## 📊 Monitoramento e Limites

### Free Tier:
```
┌──────────────────────────────────────┐
│ Comandos/dia: 10.000                 │
│ Tamanho máximo: 256 MB               │
│ Conexões simultâneas: 100            │
│ Bandwidth: 200 MB/mês                │
└──────────────────────────────────────┘
```

### Como saber quanto você está usando:

1. Dashboard Upstash → Seu database
2. Aba **"Metrics"**
3. Ver gráfico **"Daily Commands"**

### Se ultrapassar o limite:

Upstash vai:
1. **Avisar por email** quando chegar em 80%
2. **Throttle** (limitar velocidade) acima do limite
3. Sugerir upgrade para plano pago

---

## 💰 Upgrade (Opcional)

### Planos pagos (se precisar):

```
Pay-as-you-go:
├─ $0.20 por 100.000 comandos extras
├─ $0.25 por GB de storage extra
└─ Sem limites

Pro ($10/mês):
├─ 1M comandos/dia inclusos
├─ 3 GB storage
├─ Suporte prioritário
└─ Multi-region replication
```

---

## 🔧 Troubleshooting

### Problema: "Connection timeout"

**Solução 1**: Verificar se URL está correta
```bash
# No Render, vá em Environment e confira:
REDIS_URL=rediss://... (não pode ter espaços)
```

**Solução 2**: Verificar se TLS está habilitado
```bash
# URL deve começar com:
rediss:// (duplo 's') ✅
redis://  (simples 's') ❌ (não funciona com Upstash)
```

### Problema: "Authentication failed"

**Causa**: Senha errada na URL

**Solução**: Copiar novamente do Upstash (botão "Copy" na connection string)

### Problema: Muitos comandos no free tier

**Causa**: 10.000 comandos/dia esgotados

**Soluções**:
1. Aguardar reset (meia-noite UTC)
2. Fazer upgrade para plano pago
3. Otimizar código para reduzir comandos

---

## 🎯 Próximos Passos

Agora que Redis está configurado:

1. ✅ **Fila funcionando**: Documentos são indexados em background
2. ✅ **Retry automático**: Se falhar, tenta 3x com backoff exponencial
3. ✅ **Monitoramento**: Ver jobs no Upstash Data Browser

### Ver status da fila via API:

```bash
GET /api/v1/indexing/queue/stats

Response:
{
  "waiting": 0,
  "active": 1,
  "completed": 42,
  "failed": 0,
  "delayed": 0,
  "paused": false
}
```

---

## 📚 Documentação Adicional

- **Upstash Docs**: https://docs.upstash.com/redis
- **Bull Queue**: https://github.com/OptimalBits/bull
- **ioredis**: https://github.com/luin/ioredis

---

## ✅ Checklist de Configuração

- [ ] Conta criada no Upstash
- [ ] Redis database criado (us-east-1)
- [ ] Connection string copiada (rediss://)
- [ ] REDIS_URL adicionada no Render
- [ ] Deploy concluído com sucesso
- [ ] Logs mostram "Processor iniciado"
- [ ] Upload de documento testado
- [ ] Chaves aparecem no Upstash Data Browser

---

**🎉 Parabéns!** Seu sistema agora tem fila de indexação em produção com Redis serverless!
