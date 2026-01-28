# 🔑 FIX: Criar Usuário TI no Supabase

---

## ❌ Problema Identificado

```
Erro: 401 Unauthorized ao fazer login
Email: ti@educacao.gov.br
Senha: senha_super_secreta_ti_2024

Causa: Usuário não existe no banco de dados de produção
```

---

## ✅ Solução: Executar SQL no Supabase

### **1. Acessar Supabase SQL Editor**

```
URL: https://supabase.com/dashboard/project/edtsrirqtgsjphlmuwui/sql
```

### **2. Executar SQL para Criar Usuário**

Copie e cole este SQL completo no editor:

```sql
-- =====================================================
-- CRIAR USUÁRIO TI
-- =====================================================

-- 1. Deletar usuário antigo se existir
DELETE FROM users WHERE email = 'ti@educacao.gov.br';

-- 2. Criar usuário TI
-- Email: ti@educacao.gov.br
-- Senha: senha_super_secreta_ti_2024
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Equipe de TI',
  'ti@educacao.gov.br',
  '$2b$10$EO52eHY0Fj1.swjcEQW6DOzFLs.YPPNrTp9d1smBxdWBjTWHfQAlC',
  'TI',
  'active'
);

-- 3. Verificar criação
SELECT 
  id,
  name,
  email,
  role,
  status,
  created_at
FROM users
WHERE email = 'ti@educacao.gov.br';
```

### **3. Executar Query**

1. Clique em **"RUN"** ou pressione `Ctrl+Enter`
2. Você deve ver a mensagem: **"Success. 1 rows affected"**
3. A query SELECT deve retornar 1 linha com os dados do usuário

### **4. Testar Login**

```
URL: https://edu-ia-assistente-frontend.onrender.com
Email: ti@educacao.gov.br
Senha: senha_super_secreta_ti_2024
```

---

## 🔐 Credenciais Criadas

```
Email:    ti@educacao.gov.br
Senha:    senha_super_secreta_ti_2024
Perfil:   TI (acesso total)
Status:   active
```

---

## 📋 Verificação Pós-Criação

### **Verificar usuário no banco:**

```sql
SELECT * FROM users WHERE email = 'ti@educacao.gov.br';
```

**Resultado esperado:**
```
id    | <uuid>
name  | Equipe de TI
email | ti@educacao.gov.br
role  | TI
status| active
```

### **Testar autenticação via API:**

```powershell
# PowerShell
$body = @{
    email = "ti@educacao.gov.br"
    password = "senha_super_secreta_ti_2024"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://edu-ia-assistente-backend.onrender.com/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Resultado esperado:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "...",
    "name": "Equipe de TI",
    "email": "ti@educacao.gov.br",
    "role": "TI"
  }
}
```

---

## 🚀 Próximos Passos

Após criar o usuário TI com sucesso:

### **1. Fazer Login no Frontend**
```
https://edu-ia-assistente-frontend.onrender.com
```

### **2. Obter Token JWT**
```javascript
// Console do navegador (F12)
localStorage.getItem('token')
// Copie o token (começa com "eyJ...")
```

### **3. Configurar Token para Upload**
```powershell
cd C:\Users\usuario\Documents\GitHub\edu-ia-assistente\backend
$env:API_TOKEN="cole_seu_token_aqui"
$env:API_URL="https://edu-ia-assistente-backend.onrender.com"
```

### **4. Executar Upload dos Documentos**
```powershell
npx tsx scripts/upload-to-api.ts
```

---

## 🔧 Alternativa: Criar Via Backend Local

Se preferir criar o usuário via código (backend local):

```powershell
# 1. Iniciar backend local
cd backend
npm start

# 2. Criar usuário via API
$body = @{
    name = "Equipe de TI"
    email = "ti@educacao.gov.br"
    password = "senha_super_secreta_ti_2024"
    role = "TI"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://127.0.0.1:3001/api/v1/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Nota:** Esta opção cria o usuário no banco local. Para produção, use o SQL no Supabase.

---

## 📊 Outros Usuários de Teste (Opcional)

Se quiser criar usuários adicionais para testes:

```sql
-- Diretor de Escola
INSERT INTO users (name, email, password, role, status)
VALUES (
  'João Silva',
  'diretor@escola1.edu.br',
  '$2b$10$EO52eHY0Fj1.swjcEQW6DOzFLs.YPPNrTp9d1smBxdWBjTWHfQAlC',
  'DIRETOR',
  'active'
);

-- Membro da Comissão
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Maria Santos',
  'comissao@educacao.gov.br',
  '$2b$10$EO52eHY0Fj1.swjcEQW6DOzFLs.YPPNrTp9d1smBxdWBjTWHfQAlC',
  'COMISSAO',
  'active'
);

-- Secretaria
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Ana Costa',
  'secretaria@educacao.gov.br',
  '$2b$10$EO52eHY0Fj1.swjcEQW6DOzFLs.YPPNrTp9d1smBxdWBjTWHfQAlC',
  'SECRETARIA',
  'active'
);
```

**Todos com a mesma senha:** `senha_super_secreta_ti_2024`

---

## ✅ Checklist

- [ ] Acessar Supabase SQL Editor
- [ ] Executar SQL de criação do usuário TI
- [ ] Verificar usuário criado (SELECT)
- [ ] Testar login no frontend
- [ ] Obter token JWT
- [ ] Configurar token para upload
- [ ] Executar upload dos documentos

---

**🎯 EXECUTE AGORA:**

1. Acesse: https://supabase.com/dashboard/project/edtsrirqtgsjphlmuwui/sql
2. Cole o SQL acima
3. Clique em RUN
4. Teste login em: https://edu-ia-assistente-frontend.onrender.com

---

*Última atualização: 12 de janeiro de 2026*  
*Hash bcrypt gerado em: 2026-01-12*
