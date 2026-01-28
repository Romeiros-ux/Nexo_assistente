# Testes do Endpoint de Upload de Documentos

## ⚠️ PRÉ-REQUISITOS

Antes de executar os testes, certifique-se de que:

1. ✅ **Supabase Storage configurado** (seguir `SUPABASE_STORAGE_SETUP.md`)
   - Bucket `institutional-documents` criado (PRIVATE)
   - RLS policies aplicadas
   - Estrutura de pastas criada

2. ✅ **Variáveis de ambiente** (.env)
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   ```

3. ✅ **Backend rodando**
   ```bash
   cd backend
   npm run dev
   ```

4. ✅ **Usuário autenticado com JWT válido**
   - Fazer login primeiro: `POST /api/v1/auth/login`
   - Copiar o token JWT da resposta

---

## 📋 TESTE 1: Upload de Documento (Sucesso)

### Requisição
```bash
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer SEU_TOKEN_JWT
```

### Body (form-data)
```
file: [selecionar arquivo PDF/DOC]
name: "Lei Municipal 123/2023"
description: "Lei que regulamenta o ensino municipal"
document_type: "LAW"
official_number: "123/2023"
publication_date: "2023-12-01"
effective_date: "2024-01-01"
is_public: "true"
requires_authorization: "false"
```

### Resposta Esperada (201 Created)
```json
{
  "success": true,
  "message": "Documento enviado com sucesso. Status: PENDING (aguardando aprovação)",
  "data": {
    "id": "uuid-do-documento",
    "name": "Lei Municipal 123/2023",
    "description": "Lei que regulamenta o ensino municipal",
    "document_type": "LAW",
    "file_url": "laws/uuid-lei-municipal-123-2023.pdf",
    "file_type": "application/pdf",
    "file_size": 2048576,
    "status": "PENDING",
    "official_number": "123/2023",
    "publication_date": "2023-12-01T00:00:00.000Z",
    "effective_date": "2024-01-01T00:00:00.000Z",
    "is_public": true,
    "requires_authorization": false,
    "uploaded_by": "id-do-usuario",
    "uploaded_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "version": "1.0"
  }
}
```

### Validações
- ✅ Status code = 201
- ✅ Arquivo gravado no Storage em `institutional-documents/laws/`
- ✅ Metadados salvos na tabela `documents`
- ✅ Status inicial = `PENDING`
- ✅ `uploaded_by` = ID do usuário JWT

---

## 📋 TESTE 2: Upload Sem Arquivo (Erro)

### Requisição
```bash
POST /api/v1/documents/upload
Authorization: Bearer SEU_TOKEN_JWT
```

### Body (vazio ou sem campo 'file')

### Resposta Esperada (400 Bad Request)
```json
{
  "success": false,
  "message": "Nenhum arquivo foi enviado"
}
```

---

## 📋 TESTE 3: Upload Sem Campos Obrigatórios (Erro)

### Requisição
```bash
POST /api/v1/documents/upload
Authorization: Bearer SEU_TOKEN_JWT
```

### Body (form-data)
```
file: [arquivo.pdf]
description: "Descrição apenas"
```

### Resposta Esperada (400 Bad Request)
```json
{
  "success": false,
  "message": "Campos obrigatórios: name, document_type"
}
```

---

## 📋 TESTE 4: Upload Arquivo Muito Grande (Erro)

### Requisição
```bash
POST /api/v1/documents/upload
Authorization: Bearer SEU_TOKEN_JWT
```

### Body (form-data)
```
file: [arquivo maior que 50MB]
name: "Arquivo Grande"
document_type: "MANUAL"
```

### Resposta Esperada (400 Bad Request)
```json
{
  "success": false,
  "message": "Arquivo muito grande. Tamanho máximo: 50MB"
}
```

---

## 📋 TESTE 5: Upload Tipo de Arquivo Inválido (Erro)

### Requisição
```bash
POST /api/v1/documents/upload
Authorization: Bearer SEU_TOKEN_JWT
```

### Body (form-data)
```
file: [arquivo.exe ou .zip]
name: "Arquivo Inválido"
document_type: "OTHER"
```

### Resposta Esperada (400 Bad Request)
```json
{
  "success": false,
  "message": "Tipo de arquivo não permitido"
}
```

---

## 📋 TESTE 6: Listar Todos os Documentos

### Requisição
```bash
GET /api/v1/documents
Authorization: Bearer SEU_TOKEN_JWT
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Lei Municipal 123/2023",
      "document_type": "LAW",
      "status": "PENDING",
      "uploaded_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 📋 TESTE 7: Listar Com Filtros

### Requisição
```bash
GET /api/v1/documents?document_type=LAW&status=PENDING&search=123
Authorization: Bearer SEU_TOKEN_JWT
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Lei Municipal 123/2023",
      "document_type": "LAW",
      "status": "PENDING"
    }
  ],
  "count": 1
}
```

---

## 📋 TESTE 8: Buscar Documento Por ID

### Requisição
```bash
GET /api/v1/documents/:id
Authorization: Bearer SEU_TOKEN_JWT
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-do-documento",
    "name": "Lei Municipal 123/2023",
    "description": "...",
    "file_url": "laws/uuid-lei-municipal-123-2023.pdf",
    "status": "PENDING"
  }
}
```

---

## 📋 TESTE 9: Gerar URL de Download

### Requisição
```bash
GET /api/v1/documents/:id/download
Authorization: Bearer SEU_TOKEN_JWT
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "data": {
    "url": "https://xyz.supabase.co/storage/v1/object/sign/institutional-documents/laws/arquivo.pdf?token=abc123...",
    "expiresIn": 3600
  }
}
```

### Validação
- ✅ URL temporária (signed URL)
- ✅ Expira em 1 hora (3600 segundos)
- ✅ Acesso direto ao arquivo sem autenticação (durante 1h)

---

## 📋 TESTE 10: Ativar Documento (TI Apenas)

### Requisição
```bash
PATCH /api/v1/documents/:id/activate
Authorization: Bearer TOKEN_USUARIO_TI
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "message": "Documento ativado com sucesso",
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "updated_by": "id-usuario-ti"
  }
}
```

### Validação
- ✅ Status mudou de `PENDING` → `ACTIVE`
- ✅ `updated_by` preenchido
- ✅ Somente TI consegue ativar (COMISSAO retorna 403)

---

## 📋 TESTE 11: Desativar Documento (TI Apenas)

### Requisição
```bash
PATCH /api/v1/documents/:id/deactivate
Authorization: Bearer TOKEN_USUARIO_TI
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "message": "Documento desativado com sucesso",
  "data": {
    "id": "uuid",
    "status": "INACTIVE"
  }
}
```

---

## 📋 TESTE 12: Excluir Documento (Soft Delete - TI Apenas)

### Requisição
```bash
DELETE /api/v1/documents/:id
Authorization: Bearer TOKEN_USUARIO_TI
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "message": "Documento arquivado com sucesso",
  "data": {
    "id": "uuid",
    "status": "ARCHIVED"
  }
}
```

### Validação
- ✅ Status mudou para `ARCHIVED`
- ✅ Arquivo PERMANECE no Storage (não é deletado)
- ✅ Documento não aparece mais em listagens normais

---

## 📋 TESTE 13: Atualizar Metadados (TI + COMISSAO)

### Requisição
```bash
PUT /api/v1/documents/:id
Authorization: Bearer TOKEN_TI_OU_COMISSAO
Content-Type: application/json
```

### Body
```json
{
  "name": "Lei Municipal 123/2023 - ATUALIZADA",
  "description": "Nova descrição",
  "is_public": false
}
```

### Resposta Esperada (200 OK)
```json
{
  "success": true,
  "message": "Documento atualizado com sucesso",
  "data": {
    "id": "uuid",
    "name": "Lei Municipal 123/2023 - ATUALIZADA",
    "description": "Nova descrição",
    "is_public": false,
    "updated_by": "id-usuario"
  }
}
```

---

## 📋 TESTE 14: Acesso Negado (Usuário Sem Permissão)

### Requisição
```bash
POST /api/v1/documents/upload
Authorization: Bearer TOKEN_USUARIO_COMUM
```

### Resposta Esperada (403 Forbidden)
```json
{
  "success": false,
  "message": "Acesso negado. Somente membros da Comissão ou TI podem realizar esta ação."
}
```

---

## 📋 TESTE 15: Sem Token (Não Autenticado)

### Requisição
```bash
GET /api/v1/documents
(sem header Authorization)
```

### Resposta Esperada (401 Unauthorized)
```json
{
  "success": false,
  "message": "Token não fornecido"
}
```

---

## 🧪 TESTE NO POSTMAN

### Passo a Passo

1. **Login**
   ```
   POST http://localhost:3333/api/v1/auth/login
   Body (JSON):
   {
     "email": "admin@educacao.gov.br",
     "password": "senha123"
   }
   ```
   - Copiar o `data.token` da resposta

2. **Configurar Token**
   - Ir em "Authorization"
   - Type: Bearer Token
   - Token: [colar token copiado]

3. **Upload de Documento**
   ```
   POST http://localhost:3333/api/v1/documents/upload
   Body (form-data):
   - file: [selecionar arquivo PDF]
   - name: "Teste Upload"
   - description: "Documento de teste"
   - document_type: "MANUAL"
   - is_public: "true"
   - requires_authorization: "false"
   ```

4. **Verificar Storage**
   - Abrir Supabase Dashboard
   - Storage > institutional-documents > manuals/
   - Verificar se arquivo foi criado

5. **Verificar Database**
   - Table Editor > documents
   - Buscar pelo nome "Teste Upload"
   - Verificar se metadados estão corretos

---

## 🔍 VERIFICAÇÕES MANUAIS

### No Supabase Storage
```sql
-- Ver arquivos no bucket
SELECT * FROM storage.objects 
WHERE bucket_id = 'institutional-documents' 
ORDER BY created_at DESC;
```

### Na Tabela documents
```sql
-- Ver documentos inseridos
SELECT id, name, document_type, file_url, status, uploaded_by, uploaded_at
FROM documents
ORDER BY uploaded_at DESC
LIMIT 10;
```

### Teste de RLS (Frontend NÃO deve conseguir acesso direto)
```javascript
// No navegador (deve falhar)
const { data, error } = await supabase
  .storage
  .from('institutional-documents')
  .upload('laws/teste.pdf', file);

// Esperado: error = "new row violates row-level security policy"
```

---

## ✅ CRITÉRIOS DE SUCESSO

Considere o teste completo se:

1. ✅ Upload funciona (arquivo no Storage + metadados no DB)
2. ✅ Status inicial = PENDING
3. ✅ TI consegue ativar/desativar/excluir
4. ✅ COMISSAO consegue fazer upload
5. ✅ Usuários comuns NÃO conseguem fazer upload (403)
6. ✅ Signed URLs funcionam (download temporário)
7. ✅ Filtros funcionam (por tipo, status, busca)
8. ✅ Soft delete funciona (ARCHIVED, não deleta arquivo)
9. ✅ Frontend NÃO consegue acesso direto ao Storage
10. ✅ Arquivo NUNCA é salvo no disco do backend (só memória)

---

## 🚨 PROBLEMAS COMUNS

### "Bucket not found"
- Solução: Criar bucket `institutional-documents` no Supabase Dashboard

### "new row violates row-level security policy"
- Solução: Aplicar RLS policies do arquivo `SUPABASE_STORAGE_SETUP.md`

### "File too large"
- Solução: Arquivo deve ter no máximo 50 MB

### "Invalid file type"
- Solução: Apenas PDF, DOC, DOCX, MD, TXT são permitidos

### "Token inválido"
- Solução: Fazer login novamente e copiar novo token

### "Acesso negado"
- Solução: Verificar se usuário tem role TI ou COMISSAO

---

## 📝 PRÓXIMOS PASSOS

Após validar o backend:

1. ✅ Criar `frontend/src/services/document.service.ts` (PASSO 4)
2. ✅ Integrar `frontend/src/pages/admin/KnowledgeBase.tsx` (PASSO 5)
3. ✅ Remover TODOS os mocks do frontend
4. ✅ Testar upload completo Frontend → Backend → Storage → DB
5. ✅ Gerar relatório final (PASSO 6)
