# Upload Automático de Diários Oficiais

Scripts para upload automático de PDFs do Diário Oficial de Saquarema.

## 📁 Arquivos

- `auth-helper.ts` - Helper de autenticação automática
- `upload-diarios-oficiais.ts` - Script principal de upload

## 🚀 Como usar

### 1. Preparar PDFs

Coloque os PDFs na pasta `downloads/`:
```
downloads/
  D.O.S._1784-7_assinado.pdf
  D.O.S._1785-7_assinado.pdf
  ...
```

### 2. Configurar credenciais (se necessário)

Edite `auth-helper.ts` e adicione suas credenciais:

```typescript
const credenciais = [
  { email: 'seu-email@exemplo.com', password: 'sua-senha' }
];
```

### 3. Executar

```bash
cd backend/scripts
npx tsx upload-diarios-oficiais.ts
```

## 📊 O que o script faz

1. ✅ **Faz login automático** no sistema
2. ✅ **Lista todos os PDFs** na pasta downloads
3. ✅ **Extrai metadados** de cada arquivo (edição, ano, período)
4. ✅ **Faz upload individual** de cada PDF
5. ✅ **Preenche automaticamente**:
   - Nome: "Diário Oficial de Saquarema - Edição 1784/7"
   - Descrição: Informações sobre a edição e período
   - Tags: edição, ano, mês, tipo de documento
   - Domínio: DIARIO_OFICIAL
   - Subdomain: TEXTOS_COMPLETOS

## 📋 Exemplo de saída

```
🚀 UPLOAD AUTOMÁTICO DE DIÁRIOS OFICIAIS
==========================================

🔐 Fazendo login...
🔐 Tentando login: admin@saquarema.rj.gov.br...
✅ Login realizado com sucesso!
👤 Usuário: Admin

==========================================

📂 Encontrados 46 PDFs

✅ 46 PDFs válidos para processar

==========================================

[1/46] Processando edição 1784...
📤 Enviando: D.O.S._1784-7_assinado.pdf
   📝 Diário Oficial de Saquarema - Edição 1784/7
   📅 dezembro/2025
   ✅ Upload concluído!

⏳ Aguardando 2 segundos...

[2/46] Processando edição 1785...
...
```

## ⚙️ Configurações

### Pausas entre uploads

Para evitar sobrecarga, há uma pausa de 2 segundos entre cada upload:

```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```

### Mapeamento de períodos

- Edições 1784-1807: Dezembro 2025
- Edições 1808-1833: Janeiro 2026

### Tags automáticas

Cada PDF recebe:
- `diário oficial`
- `D.O.S`
- `edição {numero}`
- `ano {ano}`
- `{mes}` (dezembro/janeiro)
- `{ano civil}` (2025/2026)
- `publicações oficiais`
- `decretos`, `portarias`, `leis`, `editais`

## 🔧 Troubleshooting

### Erro de autenticação

Se o login falhar, configure manualmente em `auth-helper.ts`

### Erro de upload

Verifique:
- Backend está rodando (`npm run dev`)
- URL da API está correta (http://127.0.0.1:3001)
- Credenciais estão corretas

### PDFs não encontrados

Verifique:
- PDFs estão na pasta `downloads/`
- Nomes seguem o padrão: `D.O.S._XXXX-X_assinado.pdf`
