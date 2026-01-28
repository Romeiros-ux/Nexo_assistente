# ✅ VALIDAÇÃO DO FLUXO COMPLETO DE UPLOAD E INDEXAÇÃO

## 📋 FLUXO IMPLEMENTADO

### 1️⃣ UPLOAD (Frontend → Backend)
**Arquivo**: `backend/src/services/document.service.ts` (linhas 165-200)

```
Usuario faz upload do Excel
   ↓
📤 Upload para Supabase Storage
   ↓
💾 Criar registro em `documents` (status: PENDING)
   ↓
📝 Criar `document_version` (status: COMPLETED, indexed: false) - usa supabaseAdmin
   ↓
✅ Adicionar job na fila Redis (IndexingQueue)
   ↓
Retorna sucesso para o frontend
```

**Verificações**:
- ✅ Usa `supabaseAdmin` para bypass RLS
- ✅ Cria versão com `status='COMPLETED'` (requerido pelo processor)
- ✅ Define `indexed=false` (requerido pelo processor)
- ✅ Adiciona à fila automaticamente

---

### 2️⃣ PROCESSAMENTO EM BACKGROUND (Worker)
**Arquivo**: `backend/src/queues/indexing.processor.ts` (linhas 30-90)

```
Job pego da fila Redis
   ↓
📥 Chamar documentPreparationService.processExistingVersion()
   ↓
   ├─ 📥 Baixar arquivo do Storage
   ├─ 📄 Extrair texto (textExtractor)
   ├─ ✂️  Dividir em chunks (chunker)
   ├─ ✅ Validar chunks
   └─ 💾 Salvar chunks no banco
   ↓
🔍 Buscar versão não indexada (findUnindexedVersion)
   ↓
🔢 Chamar indexingService.indexVersion()
   ↓
   ├─ 🤖 Gerar embeddings (OpenAI)
   ├─ 💾 Salvar embeddings no banco
   └─ ✅ Marcar indexed=true
   ↓
✅ Job completo
```

**Verificações**:
- ✅ Extrai texto ANTES de gerar embeddings
- ✅ Cria chunks ANTES de gerar embeddings
- ✅ Valida chunks antes de salvar
- ✅ Gera embeddings para cada chunk
- ✅ Marca versão como indexada

---

### 3️⃣ EXTRAÇÃO DE TEXTO (DocumentPreparation)
**Arquivo**: `backend/src/services/documentPreparation.service.ts` (linhas 175-310)

**Método**: `processExistingVersion(documentId)` ← Novo método criado!

**Comportamento**:
1. Busca documento pelo ID
2. Busca versão COMPLETED mais recente
3. Verifica se chunks já existem (evita reprocessamento)
4. Baixa arquivo do Storage
5. Extrai texto usando `textExtractorService`
6. Valida texto extraído
7. Divide em chunks usando `chunkerService`
8. Valida chunks
9. Salva chunks no banco
10. Marca documento como "prepared"

**Suporte a formatos**:
- ✅ PDF (pdf-parse)
- ✅ Word/DOCX (mammoth)
- ✅ **Excel/XLSX (xlsx)** ← Suporta o arquivo do usuário!
- ✅ TXT/Markdown

---

### 4️⃣ GERAÇÃO DE EMBEDDINGS (Indexing)
**Arquivo**: `backend/src/services/indexing.service.ts`

**Método**: `indexVersion(versionId)`

**Comportamento**:
1. Busca chunks da versão
2. Verifica se já existem embeddings (reindexação)
3. Deleta embeddings antigos se existirem
4. Gera embeddings em batches (OpenAI API)
5. Salva embeddings no banco
6. Marca versão como indexada (`indexed=true`)

**Configuração**:
- Modelo: `text-embedding-3-large`
- Dimensões: 1536
- Batch size: 50 chunks por vez

---

## 🔍 PONTOS DE VALIDAÇÃO

### Ao fazer upload:
```
[Backend] 📤 Fazendo upload do arquivo para storage...
[Backend] 💾 Salvando metadados no banco...
[Backend] 📝 Criando versão do documento...
[Backend] ✅ Versão criada: <version-id>
[Backend] ✅ Documento adicionado à fila de processamento
[Backend] ✅ Upload completo com sucesso!
```

### Durante processamento:
```
[IndexingProcessor] Iniciando job <job-id>: {document_id, document_name}
[IndexingProcessor] Processando versão (extraindo texto + criando chunks)...
[DocumentPreparation] 📥 Baixando arquivo do Storage...
[DocumentPreparation] 📄 Extraindo texto...
[DocumentPreparation] ✂️  Dividindo em chunks...
[DocumentPreparation] 💾 Salvando chunks no banco...
[DocumentPreparation] ✅ <N> chunks salvos no banco
[IndexingProcessor] Versão processada: {version_id, chunks_count}
[IndexingProcessor] Versão encontrada: {version_id, version_number, status}
[IndexingService] Iniciando indexação da versão: <version-id>
[IndexingService] <N> chunks encontrados
[IndexingService] Gerando embeddings (batch 1/X)...
[IndexingService] ✅ Indexação completa
[IndexingProcessor] Indexação completa: {chunks_indexed, tokens, cost, duration}
```

### Erros esperados SE algo falhar:
- ❌ "Documento não encontrado" → ID inválido
- ❌ "Nenhuma versão encontrada" → Versão não foi criada no upload
- ❌ "Nenhum chunk encontrado" → Extração de texto falhou
- ❌ "Erro na extração" → Arquivo corrompido ou formato não suportado
- ❌ "Chunks inválidos" → Chunks muito pequenos/grandes

---

## 🎯 CHECKLIST PRÉ-UPLOAD

- ✅ Redis está rodando (`docker ps | grep redis`)
- ✅ Backend compilado (`npm run build` sem erros)
- ✅ Backend rodando (`npm run dev`)
- ✅ Variáveis de ambiente configuradas:
  - `OPENAI_API_KEY` - Para gerar embeddings
  - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` - Para acessar banco
  - `REDIS_HOST` e `REDIS_PORT` - Para fila
- ✅ Base de dados limpa (execute LIMPAR_TUDO.sql)
- ✅ Arquivo Excel válido (xlsx ou xls)

---

## 📊 VERIFICAÇÃO NO BANCO DE DADOS

Após upload completo, execute:

```sql
-- Ver documento criado
SELECT id, name, file_type, status, prepared, uploaded_at 
FROM documents 
ORDER BY uploaded_at DESC 
LIMIT 1;

-- Ver versão criada
SELECT dv.*, d.name as document_name
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
ORDER BY dv.created_at DESC
LIMIT 1;

-- Ver chunks criados
SELECT 
  d.name,
  dv.version_number,
  COUNT(dc.id) as chunks_count,
  COUNT(de.id) as embeddings_count
FROM documents d
JOIN document_versions dv ON dv.document_id = d.id
LEFT JOIN document_chunks dc ON dc.document_version_id = dv.id
LEFT JOIN document_embeddings de ON de.document_chunk_id = dc.id
WHERE d.id = '<document-id>'
GROUP BY d.id, d.name, dv.version_number;

-- Ver conteúdo de chunks (primeiros 3)
SELECT 
  chunk_index,
  LEFT(content, 100) as preview,
  LENGTH(content) as size
FROM document_chunks
WHERE document_version_id = '<version-id>'
ORDER BY chunk_index
LIMIT 3;
```

---

## 🚀 TESTE FINAL

1. Execute [LIMPAR_TUDO.sql](LIMPAR_TUDO.sql) no Supabase
2. Reinicie o backend
3. Faça upload do "Cadastro de Trabalhadores 2026.xlsx"
4. Aguarde 30-60 segundos
5. Verifique logs do backend
6. Execute as queries SQL acima
7. Teste o assistente com perguntas sobre o Excel

---

## 📝 METADADOS DO DOCUMENTO

**Para o Excel "Cadastro de Trabalhadores 2026"**:
- Nome: "Cadastro de Trabalhadores 2026"
- Descrição: "Planilha contendo o cadastro completo de todos os trabalhadores e servidores da Secretaria de Educação para o ano de 2026"
- Tags: "funcionários, servidores, trabalhadores, cadastro, recursos humanos, RH"
- Domínio: RECURSOS_HUMANOS
- Subdomínio: GESTAO_PESSOAL
- Tipo: REPORT
- Ano: 2026
- Perfis autorizados: TI, RH
