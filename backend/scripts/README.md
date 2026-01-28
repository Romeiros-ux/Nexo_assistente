# 🤖 Scripts de Indexação Automática
## Base de Conhecimento - Saquarema

---

## 📋 Visão Geral

Este diretório contém scripts automatizados para popular a base de conhecimento do assistente IA com documentos municipais de Saquarema.

### **Processo Completo:**

```
1. download-pdfs.ts   →  Baixa PDFs dos portais oficiais
2. extract-html.ts    →  Extrai conteúdo de páginas web
3. upload-to-api.ts   →  Faz upload via API backend
```

---

## 🚀 Início Rápido

### **Pré-requisitos:**

```powershell
# 1. Instalar dependências
cd backend
npm install

# 2. Obter token de autenticação (faça login no sistema)
# Vá para: http://localhost:3001 (ou produção)
# Login: ti@educacao.gov.br / senha_super_secreta_ti_2024
# Copie o token JWT do console do navegador (localStorage.getItem('token'))
```

### **Execução Completa:**

```powershell
# Definir token (Windows PowerShell)
$env:API_TOKEN="eyJhbGci..." # Cole seu token aqui

# Executar scripts em sequência
cd backend

# Passo 1: Baixar PDFs (2-3 horas)
npx tsx scripts/download-pdfs.ts

# Passo 2: Extrair conteúdo web (30 minutos)
npx tsx scripts/extract-html.ts

# Passo 3: Upload para API (3-4 horas)
npx tsx scripts/upload-to-api.ts
```

---

## 📂 Estrutura de Arquivos

```
backend/scripts/
├── config/
│   └── documents-list.json    # Lista de URLs para download
├── downloads/                  # PDFs baixados (criado automaticamente)
├── extracted/                  # Conteúdo HTML extraído (criado automaticamente)
├── download-pdfs.ts           # Script 1: Download de PDFs
├── extract-html.ts            # Script 2: Extração de HTML
├── upload-to-api.ts           # Script 3: Upload via API
├── download-log.json          # Log do download (gerado)
├── extraction-log.json        # Log da extração (gerado)
├── upload-log.json            # Log do upload (gerado)
└── README.md                  # Este arquivo
```

---

## 📖 Documentação dos Scripts

### **1. download-pdfs.ts**

**Função:** Baixa todos os PDFs listados em `config/documents-list.json`

**Uso:**
```powershell
npx tsx scripts/download-pdfs.ts
```

**Saída:**
- Arquivos PDF em `downloads/`
- Log detalhado em `download-log.json`

**Recursos:**
- ✅ Download por prioridade (CRITICAL → HIGH → MEDIUM → LOW)
- ✅ Verificação de duplicatas
- ✅ Retry em caso de erro
- ✅ Timeout de 60 segundos por arquivo
- ✅ Pausa de 1 segundo entre downloads

**Exemplo de saída:**
```
╔════════════════════════════════════════╗
║   Download Automatizado de PDFs       ║
╚════════════════════════════════════════╝

📋 Total de documentos: 6

🔥 CRÍTICOS: 1
⬇️  [1] Baixando: Plano Municipal de Educação - Saquarema
✅ [1] Plano Municipal de Educação - Saquarema (1234.56 KB)

✅ Sucesso:    6
❌ Falhas:     0
📦 Total:      6
💾 Tamanho:    5.23 MB
```

---

### **2. extract-html.ts**

**Função:** Extrai conteúdo de páginas web (QEdu, IBGE, Portal Transparência)

**Uso:**
```powershell
npx tsx scripts/extract-html.ts
```

**Saída:**
- Arquivos Markdown em `extracted/*.md`
- Dados estruturados em `extracted/*.json`
- Log detalhado em `extraction-log.json`

**Extratores Específicos:**
- **QEdu:** IDEB, taxas de aprovação, número de escolas
- **IBGE:** População, densidade demográfica, economia
- **Transparência:** Links para documentos

**Exemplo de saída:**
```
╔════════════════════════════════════════╗
║   Extração de Conteúdo Web            ║
╚════════════════════════════════════════╝

🌐 Total de páginas: 3

🔍 [web-1] Extraindo: Estatísticas Educacionais Saquarema - QEdu
✅ [web-1] Estatísticas Educacionais Saquarema - QEdu
   📄 Markdown: 1-Estatisticas-Educacionais-Saquarema-QEdu.md
   📊 JSON: 1-data.json

✅ Sucesso: 3
❌ Falhas:  0
```

---

### **3. upload-to-api.ts**

**Função:** Faz upload de todos os PDFs para o backend via API

**Uso:**
```powershell
# IMPORTANTE: Definir token antes!
$env:API_TOKEN="seu_token_jwt_aqui"

# Opcional: Definir URL do backend (padrão: http://127.0.0.1:3001)
$env:API_URL="https://edu-ia-assistente-backend.onrender.com"

# Executar upload
npx tsx scripts/upload-to-api.ts
```

**Saída:**
- Documentos indexados no banco de dados
- Log detalhado em `upload-log.json`

**Recursos:**
- ✅ Verificação de conexão com API
- ✅ Upload com FormData multipart
- ✅ Timeout de 5 minutos por arquivo (processamento pode demorar)
- ✅ Detecção automática de tipo de documento
- ✅ Pausa de 2 segundos entre uploads

**Exemplo de saída:**
```
╔════════════════════════════════════════╗
║   Upload Automatizado para API        ║
╚════════════════════════════════════════╝

🌐 API URL: http://127.0.0.1:3001
🔑 Token: eyJhbGciOiJIUzI1NiIs...

🔍 Verificando conexão com API...
✅ API online e funcionando

📄 Total de PDFs: 6

⬆️  Enviando: plano-municipal-de-educacao-saquarema.pdf
✅ plano-municipal-de-educacao-saquarema.pdf - ID: 123

✅ Sucesso: 6
❌ Falhas:  0

🎉 Upload concluído com sucesso!
```

---

## 🔧 Configuração

### **documents-list.json**

Estrutura do arquivo de configuração:

```json
{
  "documents": [
    {
      "id": 1,
      "url": "https://...",
      "title": "Nome do Documento",
      "type": "PLANO_EDUCACIONAL",
      "priority": "CRITICAL",
      "category": "educacao"
    }
  ],
  "webPages": [
    {
      "id": "web-1",
      "url": "https://...",
      "title": "Nome da Página",
      "type": "ESTATISTICA_EDUCACIONAL",
      "priority": "CRITICAL",
      "category": "educacao",
      "extractMethod": "html"
    }
  ]
}
```

**Prioridades disponíveis:**
- `CRITICAL` - Documentos essenciais (processados primeiro)
- `HIGH` - Documentos importantes
- `MEDIUM` - Documentos complementares
- `LOW` - Documentos de referência

**Tipos de documentos:**
- `PLANO_EDUCACIONAL` - Planos de educação
- `LEI_ORGANICA` - Leis orgânicas
- `LEI_ORDINARIA` - Leis ordinárias
- `LEI_COMPLEMENTAR` - Leis complementares
- `DECRETO` - Decretos municipais
- `PORTARIA` - Portarias
- `REGIMENTO` - Regimentos escolares
- `ESTATUTO` - Estatutos
- `ESTATISTICA_EDUCACIONAL` - Dados QEdu, INEP, etc.
- `DADOS_DEMOGRAFICOS` - Dados IBGE
- `OUTRO` - Outros documentos

---

## 🐛 Troubleshooting

### **Erro: "API_TOKEN não configurado"**

```powershell
# Solução: Definir token de autenticação
$env:API_TOKEN="seu_token_aqui"
```

### **Erro: "Erro ao conectar com API"**

```powershell
# Verificar se o backend está rodando
cd backend
npm start

# Verificar URL
$env:API_URL="http://127.0.0.1:3001"
```

### **Erro: "Download falhou - Timeout"**

- PDF muito grande ou conexão lenta
- Aumentar timeout em `download-pdfs.ts` (linha com `timeout: 60000`)
- Ou baixar manualmente e colocar em `downloads/`

### **Erro: "Upload falhou - 413 Request Entity Too Large"**

- Arquivo muito grande para o servidor
- Verificar configuração de limites no backend
- Pode ser necessário processar PDFs menores

---

## 📊 Métricas Esperadas

| Métrica | Valor Estimado |
|---------|---------------|
| **PDFs para download** | 50+ documentos |
| **Tamanho total** | 50-200 MB |
| **Tempo de download** | 2-3 horas |
| **Tempo de extração HTML** | 30 minutos |
| **Tempo de upload** | 3-4 horas |
| **Custo de embeddings** | ~$0.33 (2.5M tokens) |
| **Tempo total** | 6-8 horas |

---

## 🎯 Checklist de Execução

### **Antes de começar:**
- [ ] Backend rodando (`npm start`)
- [ ] Token JWT obtido (login no sistema)
- [ ] Variável `API_TOKEN` configurada
- [ ] Espaço em disco disponível (200+ MB)

### **Durante execução:**
- [ ] Monitorar logs de erro
- [ ] Verificar consumo de API (rate limiting)
- [ ] Validar arquivos baixados

### **Após conclusão:**
- [ ] Verificar logs (`*-log.json`)
- [ ] Testar busca no chat
- [ ] Validar documentos indexados no banco

---

## 🚀 Próximos Passos

Após executar todos os scripts:

1. **Validar indexação:**
   ```powershell
   # Verificar documentos no banco
   # GET /api/v1/documents
   ```

2. **Testar chat:**
   - Ir para https://edu-ia-assistente-frontend.onrender.com
   - Fazer perguntas sobre os documentos
   - Exemplo: "Qual o IDEB de Saquarema em 2023?"

3. **Adicionar mais documentos:**
   - Editar `config/documents-list.json`
   - Adicionar URLs de novos PDFs
   - Executar scripts novamente

---

## 📞 Suporte

**Problemas? Logs para compartilhar:**
- `download-log.json`
- `extraction-log.json`
- `upload-log.json`

**Comandos úteis:**
```powershell
# Ver logs do backend
cd backend
npm start

# Limpar downloads e recomeçar
Remove-Item -Recurse -Force scripts/downloads
Remove-Item -Recurse -Force scripts/extracted

# Verificar token
echo $env:API_TOKEN
```

---

*Última atualização: 12 de janeiro de 2026*  
*Versão: 1.0*
