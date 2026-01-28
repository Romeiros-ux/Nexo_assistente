# 🪣 GUIA: Criar Bucket do Supabase Storage

## 📋 Problema Atual

O sistema está tentando fazer upload de documentos mas o erro aparece:
```
❌ Falha no upload: Bucket not found
```

**Causa:** O bucket `institutional-documents` não existe no Supabase Storage.

---

## ✅ Solução: Criar o Bucket Manualmente

### Passo 1: Acessar o Painel do Supabase

1. Vá para: https://supabase.com/dashboard
2. Faça login com sua conta
3. Selecione o projeto: **edu-ia-assistente** (ou o nome do seu projeto)

### Passo 2: Acessar o Storage

1. No menu lateral esquerdo, clique em **"Storage"**
2. Você verá uma lista de buckets (provavelmente vazia)
3. Clique no botão **"New bucket"** (ou "Create bucket")

### Passo 3: Configurar o Bucket

Preencha o formulário com estas configurações:

```
📝 CONFIGURAÇÕES DO BUCKET

Nome do bucket:
institutional-documents

Opções:
✅ Public bucket: SIM (marque esta opção)
   └─ Permite gerar URLs públicas para os documentos

❌ Restrict file upload size: NÃO (deixe desmarcado)
   └─ Ou configure para 50 MB se quiser limitar

❌ Allowed MIME types: DEIXE VAZIO
   └─ Permitirá todos os tipos de arquivo
```

### Passo 4: Criar o Bucket

1. Clique em **"Create bucket"** ou **"Save"**
2. O bucket `institutional-documents` deve aparecer na lista
3. ✅ **Bucket criado com sucesso!**

---

## 🔐 Passo 5: Configurar Políticas de Segurança (RLS)

### Por que configurar políticas?

O Supabase usa **Row Level Security (RLS)** para controlar quem pode:
- 📤 Fazer upload de arquivos
- 👁️ Ver/baixar arquivos
- 🗑️ Deletar arquivos

### Como configurar?

1. No painel do Storage, clique no bucket `institutional-documents`
2. Vá na aba **"Policies"**
3. Clique em **"New policy"** ou **"Create policy"**
4. Execute as políticas abaixo:

#### Política 1: Permitir Upload (usuários autenticados)

```sql
-- No painel: New Policy → "Create policy from scratch"
-- Ou: New Policy → "Enable insert for authenticated users"

CREATE POLICY "Permitir upload de documentos para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'institutional-documents');
```

#### Política 2: Permitir Leitura Pública

```sql
-- Permite qualquer pessoa baixar documentos (via URL)

CREATE POLICY "Permitir leitura pública de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'institutional-documents');
```

#### Política 3: Permitir Delete (apenas TI e SECRETARIA)

```sql
-- Apenas usuários com role TI ou SECRETARIA podem deletar

CREATE POLICY "Permitir exclusão apenas para TI e SECRETARIA"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'institutional-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('TI', 'SECRETARIA')
  )
);
```

#### Política 4: Permitir Update (apenas TI e SECRETARIA)

```sql
-- Apenas TI e SECRETARIA podem atualizar metadados

CREATE POLICY "Permitir atualização apenas para TI e SECRETARIA"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'institutional-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('TI', 'SECRETARIA')
  )
);
```

---

## 🔍 Passo 6: Verificar Configuração

### Via Painel Supabase

1. Vá em **Storage** → `institutional-documents`
2. Clique em **"Policies"**
3. Deve mostrar 4 políticas criadas:
   - ✅ INSERT (authenticated)
   - ✅ SELECT (public)
   - ✅ DELETE (TI/SECRETARIA)
   - ✅ UPDATE (TI/SECRETARIA)

### Via SQL Editor (Opcional)

Execute estas queries no **SQL Editor**:

```sql
-- 1. Verificar se o bucket existe
SELECT * FROM storage.buckets 
WHERE id = 'institutional-documents';

-- Resultado esperado:
-- id: institutional-documents
-- name: institutional-documents
-- public: true

-- 2. Listar todas as políticas do bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects';

-- Deve mostrar as 4 políticas criadas
```

---

## 🚀 Passo 7: Testar o Upload

Após criar o bucket, execute novamente:

```powershell
npx tsx scripts/upload-to-api.ts
```

**Resultado esperado:**

```
╔════════════════════════════════════════╗
║   Upload Automatizado para API        ║
║   Saquarema - Base de Conhecimento    ║
╚════════════════════════════════════════╝

🌐 API URL: https://edu-ia-assistente-backend.onrender.com
🔑 Token: eyJhbGci...

🔍 Verificando conexão com API...
✅ API online e funcionando

📄 Total de PDFs: 6

⬆️  Enviando: plano-municipal-de-educacao-saquarema.pdf
✅ plano-municipal-de-educacao-saquarema.pdf - ID: abc123...
⬆️  Enviando: lei-organica-municipal-10812010.pdf
✅ lei-organica-municipal-10812010.pdf - ID: def456...
⬆️  Enviando: lei-ordinaria-22322022.pdf
✅ lei-ordinaria-22322022.pdf - ID: ghi789...
...

╔════════════════════════════════════════╗
║           RESUMO DO UPLOAD             ║
╚════════════════════════════════════════╝
✅ Sucesso: 6
❌ Falhas:  0
📦 Total:   6

🎉 Upload concluído com sucesso!
```

---

## ❓ Troubleshooting

### Erro: "Bucket already exists"

- ✅ **Solução:** Bucket já foi criado, pule para o Passo 5 (políticas)

### Erro: "new row violates row-level security policy"

- ❌ **Causa:** Políticas RLS não configuradas
- ✅ **Solução:** Execute as políticas do Passo 5

### Erro: "JWT expired" ou "Invalid token"

- ❌ **Causa:** Token JWT expirou
- ✅ **Solução:** Obtenha novo token:

```powershell
# 1. Fazer login novamente
$body = @{
    email = "ti@educacao.gov.br"
    password = "senha_super_secreta_ti_2024"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "https://edu-ia-assistente-backend.onrender.com/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$json = $response.Content | ConvertFrom-Json

# 2. Configurar novo token
$env:API_TOKEN = $json.data.token
Write-Host "✅ Novo token configurado!" -ForegroundColor Green

# 3. Executar upload novamente
npx tsx scripts/upload-to-api.ts
```

### Erro: "File too large"

- ❌ **Causa:** Arquivo maior que o limite do bucket
- ✅ **Solução 1:** Aumente o limite no painel (Storage → bucket → Settings → File size limit)
- ✅ **Solução 2:** Divida o PDF em partes menores

---

## 📊 Estrutura de Pastas no Storage

Após o upload, os arquivos serão organizados assim:

```
institutional-documents/
├── planos/
│   └── uuid-plano-municipal-de-educacao-saquarema.pdf
├── legislacao/
│   ├── uuid-lei-organica-municipal-10812010.pdf
│   ├── uuid-lei-ordinaria-22322022.pdf
│   ├── uuid-lei-ordinaria-26672024.pdf
│   └── uuid-lei-ordinaria-971993.pdf
└── outros/
    └── uuid-lista-de-ceps-de-saquarema.pdf
```

Cada arquivo tem:
- ✅ UUID único (evita conflitos)
- ✅ Nome sanitizado (sem caracteres especiais)
- ✅ Pasta por categoria (facilita organização)
- ✅ URL pública (para download)

---

## ✅ Checklist Final

Antes de executar o upload, confirme:

- [ ] Bucket `institutional-documents` criado
- [ ] Bucket configurado como **público**
- [ ] 4 políticas RLS criadas e ativas
- [ ] Token JWT configurado (`$env:API_TOKEN`)
- [ ] Backend em produção online (Render)
- [ ] 6 PDFs baixados em `backend/scripts/downloads/`

**Tudo pronto?** Execute:

```powershell
npx tsx scripts/upload-to-api.ts
```

🎉 **Boa sorte com o upload!**
