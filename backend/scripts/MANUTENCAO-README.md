# 🔄 Manutenção Automática - Diários Oficiais

## 📋 Visão Geral

Sistema completo para gerenciar os PDFs do Diário Oficial de Saquarema, mantendo sempre as informações mais atualizadas.

## 🎯 Problema Resolvido

**Os PDFs contêm informações de prefeito, vice-prefeito e secretários na segunda página.**

Para garantir que o sistema sempre retorne os nomes atuais:

✅ **Busca inteligente**: Detecta queries sobre autoridades automaticamente  
✅ **Prioriza documento mais recente**: Sempre busca no PDF mais atual  
✅ **Manutenção automática**: Mantém apenas os 10 PDFs mais recentes ativos

## 🤖 Detecção Automática de Queries

O sistema detecta automaticamente perguntas sobre autoridades:

- ✅ "Quem é o prefeito?"
- ✅ "Qual o secretário de educação?"
- ✅ "Nome do vice-prefeito"
- ✅ "Secretário municipal de saúde"
- ✅ "Gestão municipal atual"

**Resultado**: Sempre retorna informações do PDF mais recente!

## 📦 Scripts Disponíveis

### 1. `verificar-novos-diarios.ts` (Recomendado)

Script completo de verificação e manutenção automática.

```bash
npx tsx verificar-novos-diarios.ts
```

**O que faz:**
- 🔍 Detecta novos PDFs na pasta downloads/
- ⚠️ Alerta sobre arquivos novos
- 📦 Arquiva automaticamente documentos antigos
- ✅ Mantém apenas os 10 PDFs mais recentes ATIVOS

**Executar**: Semanalmente (segunda-feira)

---

### 2. `manter-diarios-recentes.ts`

Manutenção manual: mantém apenas os N PDFs mais recentes.

```bash
npx tsx manter-diarios-recentes.ts
```

**Configuração** (linha 21 do arquivo):
```typescript
const MANTER_ULTIMOS = 10;  // Quantos manter
const ACAO = 'ARQUIVAR';     // 'ARQUIVAR' ou 'EXCLUIR'
```

**Opções:**
- `ARQUIVAR`: Muda status para ARCHIVED (recomendado)
- `EXCLUIR`: Remove permanentemente do banco

---

### 3. `upload-diarios-oficiais.ts`

Upload automático de novos PDFs.

```bash
npx tsx upload-diarios-oficiais.ts
```

**Quando usar**: Ao adicionar novos PDFs na pasta downloads/

---

### 4. `aprovar-documentos.ts`

Aprova todos os documentos PENDING em massa.

```bash
npx tsx aprovar-documentos.ts
```

**Quando usar**: Após fazer upload de novos PDFs

---

### 5. `monitorar-uploads.ts`

Monitora status dos documentos.

```bash
npx tsx monitorar-uploads.ts
```

**Resultado:**
```
📊 STATUS DOS DOCUMENTOS - DIÁRIO OFICIAL
============================================================
📋 Por Status:
   ⏳ PENDING: 0
   ✅ ACTIVE: 10
   📦 ARCHIVED: 36
   
📁 Por Subdomínio:
   TEXTOS_COMPLETOS: 46
   
📊 TOTAL: 46 documentos
```

## 🔄 Fluxo Recomendado

### Upload de Novos PDFs

```bash
# 1. Adicionar PDFs em downloads/
# 2. Fazer upload
npx tsx upload-diarios-oficiais.ts

# 3. Aprovar
npx tsx aprovar-documentos.ts

# 4. Arquivar antigos (mantém 10 mais recentes)
npx tsx manter-diarios-recentes.ts
```

### Verificação Periódica (Automática)

```bash
# Executa verificação completa
npx tsx verificar-novos-diarios.ts
```

## ⏰ Agendamento Automático

### Windows - Agendador de Tarefas

1. **Abrir**: Agendador de Tarefas
2. **Criar Tarefa Básica**
   - Nome: "Manutenção Diários Oficiais"
   - Descrição: "Verificação semanal de novos PDFs"
3. **Gatilho**: Semanal
   - Toda segunda-feira às 09:00
4. **Ação**: Iniciar programa
   - Programa: `npx`
   - Argumentos: `tsx verificar-novos-diarios.ts`
   - Diretório inicial: `C:\path\to\backend\scripts`

### Linux/Mac - Crontab

```bash
# Editar crontab
crontab -e

# Adicionar linha (segunda-feira 9h)
0 9 * * 1 cd /path/to/backend/scripts && npx tsx verificar-novos-diarios.ts >> /var/log/diarios.log 2>&1
```

### Docker - Cron Container

```dockerfile
# Dockerfile
FROM node:18
RUN apt-get update && apt-get install -y cron
COPY crontab /etc/cron.d/diarios-cron
RUN chmod 0644 /etc/cron.d/diarios-cron
CMD ["cron", "-f"]
```

```bash
# crontab
0 9 * * 1 cd /app/backend/scripts && npx tsx verificar-novos-diarios.ts
```

## 📊 Exemplo de Execução

```bash
$ npx tsx verificar-novos-diarios.ts

🤖 VERIFICAÇÃO AUTOMÁTICA DE NOVOS DIÁRIOS OFICIAIS
============================================================
📅 Data: 26/01/2026 14:30:00
============================================================

📋 Último check: 19/01/2026 09:00:00
📁 Arquivos já enviados: 46

🔍 Verificando novos PDFs...

🆕 Encontrados 3 novos PDFs:
   1. D.O.S._1834-8_assinado.pdf
   2. D.O.S._1835-8_assinado.pdf
   3. D.O.S._1836-8_assinado.pdf

💡 Para fazer upload dos novos arquivos, execute:
   npx tsx upload-diarios-oficiais.ts

🔄 Executando manutenção...

📦 Arquivando 3 documentos antigos...

✅ Arquivado: Diário Oficial de Saquarema - Edição 1784/7
✅ Arquivado: Diário Oficial de Saquarema - Edição 1785/7
✅ Arquivado: Diário Oficial de Saquarema - Edição 1786/7

📊 Total arquivado: 3 documentos

============================================================
✅ Verificação concluída
============================================================
```

## 🎯 Benefícios

### 1. Informações Sempre Atualizadas
✅ Queries sobre prefeito/secretários retornam os nomes corretos  
✅ Sistema prioriza automaticamente o PDF mais recente  
✅ Segunda página dos PDFs é indexada corretamente

### 2. Performance Otimizada
✅ Menos documentos ativos = buscas mais rápidas  
✅ Reduz custo de embeddings  
✅ Melhora tempo de resposta

### 3. Gestão Automática
✅ Script agenda cuida de tudo  
✅ Não precisa intervenção manual  
✅ Logs completos de todas as operações

### 4. Histórico Preservado
✅ Documentos antigos são ARQUIVADOS, não excluídos  
✅ Possível reativar se necessário  
✅ Auditoria completa mantida

## 🔍 Como Funciona a Busca

### Antes (Problema)
```
Usuário: "Quem é o secretário de educação?"
Sistema: Busca em TODOS os 46 PDFs
Resultado: Pode retornar nome desatualizado
```

### Depois (Solução)
```
Usuário: "Quem é o secretário de educação?"
Sistema: 
  1. ✅ Detecta query sobre autoridade
  2. ✅ Filtra por DIARIO_OFICIAL/TEXTOS_COMPLETOS
  3. ✅ Ordena por data (mais recente primeiro)
  4. ✅ Busca na segunda página do PDF mais atual
Resultado: ✅ Nome atualizado!
```

## 📝 Logs e Monitoramento

Todos os scripts geram logs detalhados:

```
[SearchService] 👔 Query sobre AUTORIDADES detectada - priorizando documento mais recente
[SearchService] 📅 Documento mais recente selecionado: Diário Oficial de Saquarema - Edição 1833/8 (2026-01-20)
```

Para verificar status a qualquer momento:

```bash
npx tsx monitorar-uploads.ts
```

## ⚠️ Importante

1. **Backup**: Documentos são ARQUIVADOS, não excluídos
2. **Reversível**: Possível reativar documentos arquivados
3. **Configurável**: Ajuste quantos PDFs manter (padrão: 10)
4. **Logs**: Todos os arquivos processados são registrados

## 🆘 Troubleshooting

### Documentos não estão sendo priorizados

Verifique se o backend foi reiniciado após as alterações:
```bash
cd backend
npm run dev
```

### Script não detecta novos PDFs

Verifique se os PDFs seguem o padrão:
```
D.O.S._[edição]-[ano]_assinado.pdf
Exemplo: D.O.S._1834-8_assinado.pdf
```

### Erro ao arquivar

Verifique permissões no banco de dados e logs do Supabase.

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Logs do backend (`npm run dev`)
2. Logs do Supabase
3. Status dos documentos (`npx tsx monitorar-uploads.ts`)
