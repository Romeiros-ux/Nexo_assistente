# 🔄 Teste do Endpoint de Reprocessamento

## ✅ Passo 1: Verificar documento PENDING

Execute no Supabase SQL Editor:

```sql
SELECT 
  d.id,
  d.name,
  d.status,
  d.file_url,
  dv.id as version_id,
  dv.version_number,
  (SELECT COUNT(*) FROM document_chunks WHERE document_version_id = dv.id) as chunk_count
FROM documents d
LEFT JOIN LATERAL (
  SELECT id, version_number 
  FROM document_versions 
  WHERE document_id = d.id 
  ORDER BY version_number DESC 
  LIMIT 1
) dv ON true
WHERE d.status = 'PENDING'
ORDER BY d.uploaded_at DESC
LIMIT 1;
```

**Resultado esperado:**
- status = 'PENDING'
- chunk_count = 0

Copie o **ID** do documento.

---

## ✅ Passo 2: Ativar documento

Execute no Supabase SQL Editor:

```sql
UPDATE documents 
SET status = 'ACTIVE' 
WHERE id = 'COLE_AQUI_O_ID_DO_PASSO_1';

-- Confirmar
SELECT id, name, status FROM documents WHERE id = 'COLE_AQUI_O_ID_DO_PASSO_1';
```

---

## ✅ Passo 3: Obter token de autenticação

Execute no PowerShell:

```powershell
# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"usuario@eduia.com.br","password":"123456"}'

$token = $loginResponse.token
Write-Host "Token obtido: $token"
```

---

## ✅ Passo 4: Chamar endpoint de reprocessamento

Execute no PowerShell (substitua `DOCUMENT_ID` e `TOKEN`):

```powershell
$documentId = "COLE_AQUI_O_ID_DO_PASSO_1"
$token = "COLE_AQUI_O_TOKEN_DO_PASSO_3"

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/documents/$documentId/reindex" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }

$response | ConvertTo-Json
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Documento enviado para reprocessamento. Aguarde ~30-60 segundos."
}
```

---

## ✅ Passo 5: Aguardar processamento

Aguarde **30-60 segundos** e observe os logs do backend no terminal.

Você deve ver logs como:
```
[IndexingProcessor] Processando job process-document...
[IndexingService] Processando documento: Cadastro de Trabalhadores 2026.xlsx
[IndexingService] Extraindo texto do arquivo...
[IndexingService] Gerando embeddings...
[IndexingService] Embeddings gerados: 15 chunks
```

---

## ✅ Passo 6: Verificar chunks gerados

Execute no Supabase SQL Editor:

```sql
SELECT 
  d.id,
  d.name,
  d.status,
  dv.id as version_id,
  dv.version_number,
  (SELECT COUNT(*) FROM document_chunks WHERE document_version_id = dv.id) as chunk_count
FROM documents d
LEFT JOIN LATERAL (
  SELECT id, version_number 
  FROM document_versions 
  WHERE document_id = d.id 
  ORDER BY version_number DESC 
  LIMIT 1
) dv ON true
WHERE d.id = 'COLE_AQUI_O_ID_DO_PASSO_1';

-- Ver os chunks criados (use o version_id da query acima)
SELECT 
  id,
  chunk_index,
  LENGTH(content) as content_size,
  LENGTH(embedding::text) as embedding_size
FROM document_chunks
WHERE document_version_id = 'COLE_AQUI_O_VERSION_ID'
ORDER BY chunk_index
LIMIT 5;
```

**Resultado esperado:**
- chunk_count > 0
- Vários chunks criados com embeddings

---

## ✅ Passo 7: Testar busca RAG

Execute no Supabase SQL Editor:

```sql
-- Buscar chunks relevantes (use o version_id do Passo 6)
SELECT 
  dc.content,
  dc.chunk_index,
  d.name as document_name,
  dv.version_number
FROM document_chunks dc
JOIN document_versions dv ON dv.id = dc.document_version_id
JOIN documents d ON d.id = dv.document_id
WHERE dc.document_version_id = 'COLE_AQUI_O_VERSION_ID'
ORDER BY dc.chunk_index
LIMIT 3;
```

*(Para testar a busca vetorial completa, use o endpoint do chat)*

---

## ✅ Passo 8: Testar assistente

Navegue para a interface do chat e pergunte:

1. "Quantos funcionários temos cadastrados?"
2. "Quem trabalha na divisão de RH?"
3. "Qual o cargo de [nome específico do Excel]?"

O assistente deve buscar informações do documento Excel processado.

---

## 🎯 Script completo PowerShell

```powershell
# ========================================
# SCRIPT COMPLETO: Reprocessar documento
# ========================================

# 1. Login
Write-Host "==> Fazendo login..."
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"usuario@eduia.com.br","password":"123456"}'

$token = $loginResponse.token
Write-Host "Token obtido: $token" -ForegroundColor Green

# 2. Substituir pelo ID do seu documento
$documentId = "COLE_AQUI_O_ID_DO_DOCUMENTO"

# 3. Chamar reindex
Write-Host "`n==> Enviando documento para reprocessamento..."
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/documents/$documentId/reindex" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }

Write-Host "Resposta:" -ForegroundColor Cyan
$response | ConvertTo-Json

# 4. Aguardar
Write-Host "`n==> Aguardando 45 segundos para processamento..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# 5. Verificar documento
Write-Host "`n==> Verificando documento..."
$docResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/documents/$documentId" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
  }

Write-Host "Status do documento:" -ForegroundColor Cyan
$docResponse.data | Select-Object id, name, status | Format-List

Write-Host "`n✅ Processo concluído! Verifique os logs do backend." -ForegroundColor Green
Write-Host "Se houver chunks, o documento está pronto para uso no chat." -ForegroundColor Green
```

---

## 📊 Troubleshooting

### ❌ Erro: "Documento não encontrado"
- Verifique se o ID está correto
- Execute o Passo 1 novamente para obter o ID correto

### ❌ Erro: "Unauthorized"
- Token expirado ou inválido
- Execute o Passo 3 novamente para obter novo token

### ❌ Nenhum chunk gerado após 60 segundos
- Verifique logs do backend: `cd backend; npm run dev`
- Verifique se Redis está rodando: `docker ps | Select-String redis`
- Verifique se há erros no IndexingProcessor

### ❌ Erro: "Redis connection refused"
- Inicie Redis: `docker start redis-edu-ia`
- Verifique conexão: `docker exec redis-edu-ia redis-cli ping`

---

## 🎓 Explicação técnica

### O que acontece ao chamar `/reindex`:

1. **Controller** recebe requisição (`document.controller.ts`)
2. **Service** busca documento no banco (`document.service.ts`)
3. **Service** envia job para fila Redis via BullMQ (`indexing.queue.ts`)
4. **Processor** pega job da fila (`indexing.processor.ts`)
5. **IndexingService** baixa arquivo do Supabase Storage
6. **IndexingService** extrai texto (PDF/DOC/XLS com pdf-parse/mammoth/xlsx)
7. **IndexingService** divide texto em chunks (500-800 chars)
8. **IndexingService** gera embeddings via OpenAI (text-embedding-3-large)
9. **IndexingService** salva chunks + embeddings no banco (`document_chunks`)
10. **RAG** usa pgvector + HNSW para buscar chunks relevantes

### Fluxo de processamento:

```
Upload → PENDING → Redis Job → Processor → Embeddings → ACTIVE
```

Se o documento foi enviado **antes** do Redis estar disponível, ele fica preso em PENDING.

O endpoint `/reindex` força a criação de um novo job para processar o documento.

---

✅ **Pronto para testar!**
