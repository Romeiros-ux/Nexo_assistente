# 📋 Guia de Melhorias - Upload de Documento

## ✅ O que já foi implementado:

### 1. **Backend - Tipos e Interfaces** ✅
- Novos campos adicionados em `src/services/document.service.ts` (frontend)
- Novos campos adicionados no upload do serviço

### 2. **Padrão de Categorização** ✅
- Arquivo criado: `src/constants/documentCategories.ts`
- Define 9 domínios principais:
  - REGULAMENTAÇÃO
  - PEDAGÓGICO
  - CALENDÁRIO
  - INDICADORES_EDUCACIONAIS
  - ADMINISTRATIVO
  - RECURSOS_HUMANOS
  - FINANCEIRO
  - INFRAESTRUTURA
  - OUTROS

### 3. **Funções de Edição** ✅
- `handleOpenEdit()` - Abre modal com dados do documento
- `handleSaveEdit()` - Salva alterações
- Estados `isEditDialogOpen`, `editingDocument`, `editData` criados

---

## 🔧 O que precisa ser adicionado MANUALMENTE:

### **PASSO 1: Adicionar novos campos no formulário de UPLOAD**

No arquivo `src/pages/admin/KnowledgeBase.tsx`, **após a linha 687** (depois dos campos de visibilidade), adicione:

```tsx
                    {/* NOVOS CAMPOS DE ESTRUTURAÇÃO */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-semibold text-sm">Estruturação da Base de Conhecimento</h4>
                      <p className="text-xs text-muted-foreground">
                        Estes campos ajudam o assistente a encontrar informações mais precisas
                      </p>

                      {/* Domain e Subdomain */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Domínio</Label>
                          <Select
                            value={uploadData.domain}
                            onValueChange={(value) => {
                              setUploadData({ ...uploadData, domain: value, subdomain: '' });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um domínio" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_DOMAINS.map((domain) => (
                                <SelectItem key={domain.value} value={domain.value}>
                                  {domain.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Subdomínio</Label>
                          <Select
                            value={uploadData.subdomain}
                            onValueChange={(value) => setUploadData({ ...uploadData, subdomain: value })}
                            disabled={!uploadData.domain}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um subdomínio" />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadData.domain && getSubdomainsByDomain(uploadData.domain).map((sub) => (
                                <SelectItem key={sub.value} value={sub.value}>
                                  {sub.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Ano e Versão */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ano de Referência</Label>
                          <Input
                            type="number"
                            value={uploadData.metadata_year}
                            onChange={(e) => setUploadData({ ...uploadData, metadata_year: parseInt(e.target.value) })}
                            placeholder="Ex: 2026"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Versão do Documento</Label>
                          <Input
                            value={uploadData.document_version}
                            onChange={(e) => setUploadData({ ...uploadData, document_version: e.target.value })}
                            placeholder="Ex: 1.0, 2.1"
                          />
                        </div>
                      </div>

                      {/* Unidade Escolar */}
                      <div className="space-y-2">
                        <Label>Unidade Escolar</Label>
                        <Input
                          value={uploadData.unit_name}
                          onChange={(e) => setUploadData({ ...uploadData, unit_name: e.target.value })}
                          placeholder="Ex: Escola Municipal Centro, Secretaria de Educação"
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco se o documento for geral (válido para todas as unidades)
                        </p>
                      </div>

                      {/* Data de Aprovação */}
                      <div className="space-y-2">
                        <Label>Data de Aprovação</Label>
                        <Input
                          type="date"
                          value={uploadData.approved_date}
                          onChange={(e) => setUploadData({ ...uploadData, approved_date: e.target.value })}
                        />
                      </div>
                    </div>
```

---

### **PASSO 2: Adicionar BOTÃO DE EDIÇÃO na lista de documentos**

No arquivo `src/pages/admin/KnowledgeBase.tsx`, **encontre a linha ~738** (dentro do map de documentos, após o botão de Download), e adicione **ANTES** dos botões de Ativar/Desativar/Arquivar:

```tsx
                        {/* Edit Button (TI or COMISSAO) */}
                        {(canManage || isComissao) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(doc)}
                          >
                            <Edit className="w-3 h-3 mr-2" />
                            Editar
                          </Button>
                        )}
```

---

### **PASSO 3: Adicionar MODAL DE EDIÇÃO**

No arquivo `src/pages/admin/KnowledgeBase.tsx`, **após o Dialog de Upload** (linha ~705), adicione:

```tsx
            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Editar Documento</DialogTitle>
                  <DialogDescription>
                    Atualize as informações e categorização do documento
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label>Nome do Documento *</Label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Tipo e Número Oficial */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={editData.document_type}
                        onValueChange={(value) => setEditData({ ...editData, document_type: value as DocumentType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORM">Norma</SelectItem>
                          <SelectItem value="LAW">Lei</SelectItem>
                          <SelectItem value="RESOLUTION">Resolução</SelectItem>
                          <SelectItem value="DIRECTIVE">Portaria</SelectItem>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="REPORT">Relatório</SelectItem>
                          <SelectItem value="OTHER">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Número Oficial</Label>
                      <Input
                        value={editData.official_number || ''}
                        onChange={(e) => setEditData({ ...editData, official_number: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Publicação</Label>
                      <Input
                        type="date"
                        value={editData.publication_date || ''}
                        onChange={(e) => setEditData({ ...editData, publication_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Vigência</Label>
                      <Input
                        type="date"
                        value={editData.effective_date || ''}
                        onChange={(e) => setEditData({ ...editData, effective_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* CAMPOS DE ESTRUTURAÇÃO */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-semibold text-sm">Categorização da Base de Conhecimento</h4>

                    {/* Domain e Subdomain */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Domínio</Label>
                        <Select
                          value={editData.domain || ''}
                          onValueChange={(value) => setEditData({ ...editData, domain: value, subdomain: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_DOMAINS.map((domain) => (
                              <SelectItem key={domain.value} value={domain.value}>
                                {domain.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Subdomínio</Label>
                        <Select
                          value={editData.subdomain || ''}
                          onValueChange={(value) => setEditData({ ...editData, subdomain: value })}
                          disabled={!editData.domain}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {editData.domain && getSubdomainsByDomain(editData.domain).map((sub) => (
                              <SelectItem key={sub.value} value={sub.value}>
                                {sub.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Ano e Versão */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ano</Label>
                        <Input
                          type="number"
                          value={editData.metadata_year || ''}
                          onChange={(e) => setEditData({ ...editData, metadata_year: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Versão</Label>
                        <Input
                          value={editData.document_version || ''}
                          onChange={(e) => setEditData({ ...editData, document_version: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Unidade */}
                    <div className="space-y-2">
                      <Label>Unidade Escolar</Label>
                      <Input
                        value={editData.unit_name || ''}
                        onChange={(e) => setEditData({ ...editData, unit_name: e.target.value })}
                      />
                    </div>

                    {/* Data de Aprovação */}
                    <div className="space-y-2">
                      <Label>Data de Aprovação</Label>
                      <Input
                        type="date"
                        value={editData.approved_date || ''}
                        onChange={(e) => setEditData({ ...editData, approved_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Documento Público</Label>
                        <p className="text-xs text-muted-foreground">
                          Permite acesso a todos os usuários autenticados
                        </p>
                      </div>
                      <Switch
                        checked={editData.is_public}
                        onCheckedChange={(checked) => setEditData({ ...editData, is_public: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Requer Autorização Especial</Label>
                        <p className="text-xs text-muted-foreground">
                          Somente usuários com permissão específica podem acessar
                        </p>
                      </div>
                      <Switch
                        checked={editData.requires_authorization}
                        onCheckedChange={(checked) => setEditData({ ...editData, requires_authorization: checked })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit} className="institutional-gradient">
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
```

---

## 🎯 Backend - Ajustes Necessários

### **PASSO 4: Atualizar o backend para aceitar novos campos**

No arquivo `backend/src/controllers/document.controller.ts`, **atualizar a linha ~42** para incluir novos campos:

```typescript
      const metadata: CreateDocumentRequest = {
        name: req.body.name,
        description: req.body.description,
        document_type: req.body.document_type,
        official_number: req.body.official_number,
        publication_date: req.body.publication_date,
        effective_date: req.body.effective_date,
        is_public: req.body.is_public === 'true' || req.body.is_public === true,
        requires_authorization: req.body.requires_authorization === 'true' || req.body.requires_authorization === true,
        // Novos campos
        domain: req.body.domain,
        subdomain: req.body.subdomain,
        metadata_year: req.body.metadata_year ? parseInt(req.body.metadata_year) : undefined,
        unit_name: req.body.unit_name,
        unit_id: req.body.unit_id,
        document_version: req.body.document_version,
        approved_date: req.body.approved_date
      };
```

### **PASSO 5: Adicionar colunas no banco de dados**

Execute no Supabase SQL Editor:

```sql
-- Adicionar novos campos na tabela documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata_year INTEGER,
ADD COLUMN IF NOT EXISTS unit_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS document_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS approved_date DATE;

-- Adicionar comentários
COMMENT ON COLUMN public.documents.domain IS 'Domínio do documento (ex: REGULAMENTAÇÃO, PEDAGÓGICO)';
COMMENT ON COLUMN public.documents.subdomain IS 'Subdomínio específico dentro do domínio';
COMMENT ON COLUMN public.documents.metadata_year IS 'Ano de referência do documento';
COMMENT ON COLUMN public.documents.unit_name IS 'Nome da unidade escolar (deixe vazio se for geral)';
COMMENT ON COLUMN public.documents.unit_id IS 'ID da unidade escolar (referência para educational_units)';
COMMENT ON COLUMN public.documents.document_version IS 'Versão do documento (ex: 1.0, 2.1)';
COMMENT ON COLUMN public.documents.approved_date IS 'Data de aprovação oficial do documento';

-- Criar índices para melhor performance de busca
CREATE INDEX IF NOT EXISTS idx_documents_domain ON public.documents(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_subdomain ON public.documents(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_year ON public.documents(metadata_year) WHERE metadata_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_unit ON public.documents(unit_id) WHERE unit_id IS NOT NULL;
```

---

## ✅ Resumo do que Fazer:

1. ✅ **PASSO 1**: Adicionar novos campos no formulário de upload
2. ✅ **PASSO 2**: Adicionar botão "Editar" na lista de documentos
3. ✅ **PASSO 3**: Adicionar modal de edição completo
4. ✅ **PASSO 4**: Atualizar backend controller
5. ✅ **PASSO 5**: Executar SQL no Supabase

**Após estes passos:**
- ✅ Formulário de upload terá todos os campos
- ✅ Botão de edição aparecerá ao lado do status
- ✅ Modal de edição permitirá categorizar documentos existentes
- ✅ Backend salvará os novos campos
- ✅ Base de dados terá estrutura completa

---

## 📊 Exemplo de Documento Completo:

```json
{
  "name": "Regimento Interno 2026",
  "description": "Regimento interno da Escola Municipal Centro",
  "document_type": "NORM",
  "official_number": "001/2026",
  "publication_date": "2026-01-01",
  "effective_date": "2026-02-01",
  "approved_date": "2025-12-15",
  "is_public": true,
  "requires_authorization": false,
  
  "domain": "REGULAMENTAÇÃO",
  "subdomain": "REGIMENTO_INTERNO",
  "metadata_year": 2026,
  "unit_name": "Escola Municipal Centro",
  "unit_id": "uuid-da-escola",
  "document_version": "1.0"
}
```

---

## 🎯 Benefícios da Estruturação:

1. **Busca mais precisa** - Assistente encontra documentos por domínio/subdomínio
2. **Contexto melhor** - Sabe o ano, unidade e versão do documento
3. **Governança** - Pode filtrar por unidade escolar
4. **Rastreabilidade** - Data de aprovação e versão documentadas
5. **Organização** - Base de conhecimento estruturada e padronizada

---

Quer que eu implemente algum destes passos automaticamente?
