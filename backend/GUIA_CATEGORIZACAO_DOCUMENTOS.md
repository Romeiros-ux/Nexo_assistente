# Guia de Categorização de Documentos

Este guia explica como preencher cada campo ao cadastrar documentos na Base de Conhecimento Institucional, facilitando a busca e recuperação de informações pelo assistente de IA.

## 📋 Campos Básicos

### **Nome do Documento***
- **O que é**: Título principal do documento
- **Como preencher**: Use o nome oficial completo
- **Exemplos**:
  - ✅ "Lei Municipal 123/2023 - Plano Municipal de Educação"
  - ✅ "Resolução SEMED 045/2024 - Calendário Escolar"
  - ❌ "documento1.pdf" (muito genérico)

### **Descrição**
- **O que é**: Resumo do conteúdo e finalidade do documento
- **Como preencher**: 2-3 frases explicando o que o documento contém
- **Exemplos**:
  - ✅ "Estabelece as diretrizes e metas do Plano Municipal de Educação para o período 2024-2034"
  - ✅ "Define o calendário letivo das escolas municipais para o ano de 2024, incluindo feriados, recessos e períodos de avaliação"

### **Tipo***
- **O que é**: Classificação do formato/natureza do documento
- **Opções disponíveis**:
  - **NORM** (Norma): Regulamentos, diretrizes, instruções normativas
  - **LAW** (Lei): Leis municipais, estaduais, federais
  - **RESOLUTION** (Resolução): Resoluções de conselhos, comitês
  - **DIRECTIVE** (Portaria): Portarias administrativas
  - **MANUAL** (Manual): Manuais de procedimentos, guias
  - **REPORT** (Relatório): Relatórios de gestão, indicadores
  - **OTHER** (Outro): Outros tipos não listados

### **Número Oficial**
- **O que é**: Número de protocolo/publicação do documento
- **Como preencher**: Formato oficial (número/ano)
- **Exemplos**:
  - ✅ "123/2023"
  - ✅ "045/2024"
  - ✅ "SEMED-2024-001"

---

## 🏷️ Categorização Avançada

### **Domínio***
**O que é**: Área temática principal do documento

**Domínios disponíveis**:

1. **REGULAMENTAÇÃO**
   - Quando usar: Leis, decretos, normas, regulamentos
   - Exemplos: Lei de Diretrizes e Bases, Estatuto do Magistério

2. **PEDAGÓGICO**
   - Quando usar: Conteúdos educacionais, currículos, metodologias
   - Exemplos: Plano de Curso, Projeto Político Pedagógico

3. **CALENDÁRIO**
   - Quando usar: Calendários, cronogramas, datas importantes
   - Exemplos: Calendário Letivo, Cronograma de Matrículas

4. **INDICADORES_EDUCACIONAIS**
   - Quando usar: Dados, estatísticas, índices educacionais
   - Exemplos: IDEB, Taxa de Aprovação, Censo Escolar

5. **ADMINISTRATIVO**
   - Quando usar: Processos administrativos, formulários, procedimentos
   - Exemplos: Manual de Matrícula, Processo de Transferência

6. **RECURSOS_HUMANOS**
   - Quando usar: Gestão de pessoal, concursos, capacitação
   - Exemplos: Edital de Concurso, Plano de Capacitação

7. **FINANCEIRO**
   - Quando usar: Orçamentos, prestação de contas, recursos
   - Exemplos: Plano de Aplicação de Recursos, Relatório Financeiro

8. **INFRAESTRUTURA**
   - Quando usar: Obras, manutenção, equipamentos
   - Exemplos: Projeto de Reforma, Inventário de Equipamentos

9. **OUTROS**
   - Quando usar: Documentos que não se encaixam nas categorias acima

### **Subdomínio**
**O que é**: Subcategoria específica dentro do domínio escolhido

**Como funciona**: Ao selecionar um domínio, os subdomínios relacionados aparecem automaticamente.

**Exemplos por domínio**:

**REGULAMENTAÇÃO** →
- Legislação Federal, Estadual, Municipal
- Normas e Diretrizes, Resoluções de Conselhos

**PEDAGÓGICO** →
- Currículo e Programas, Avaliação e Resultados
- Metodologias de Ensino, Educação Especial/Inclusiva

**CALENDÁRIO** →
- Ano Letivo, Matrículas e Transferências
- Eventos e Atividades

**INDICADORES_EDUCACIONAIS** →
- IDEB, Censo Escolar, Taxas de Aprovação/Reprovação

**ADMINISTRATIVO** →
- Processos de Matrícula, Documentação Escolar
- Atendimento ao Público, Gestão de Documentos

---

## 🎯 Campos Contextuais

### **Ano de Referência**
- **O que é**: Ano a que o documento se refere
- **Como preencher**: Ano com 4 dígitos
- **Quando preencher**: 
  - ✅ Calendário Letivo 2024 → `2024`
  - ✅ IDEB 2023 → `2023`
  - ✅ Lei aprovada em 2024 → `2024`
- **Quando deixar em branco**: Documentos sem referência temporal específica

### **Versão do Documento**
- **O que é**: Número da versão/revisão do documento
- **Como preencher**: Formato numérico (1.0, 2.1, etc.)
- **Exemplos**:
  - Primeira versão → `1.0`
  - Primeira revisão → `1.1`
  - Segunda versão completa → `2.0`
- **Quando deixar em branco**: Documentos únicos sem versionamento

### **Nome da Unidade Educacional**
- **O que é**: Nome da escola/creche específica (se aplicável)
- **Como preencher**: Nome oficial completo da unidade
- **Quando preencher**:
  - ✅ PPP da Escola Municipal João Silva → `Escola Municipal João Silva`
  - ✅ Relatório IDEB da EMEF Machado de Assis → `EMEF Machado de Assis`
- **Quando deixar em branco**: 
  - ❌ Documentos gerais da rede (Lei Municipal, Calendário da Rede)
  - ❌ Normas aplicáveis a todas as escolas

### **Data de Aprovação**
- **O que é**: Data em que o documento foi oficialmente aprovado/publicado
- **Como preencher**: Formato de data (DD/MM/AAAA)
- **Exemplos**:
  - Lei publicada → Data da publicação no Diário Oficial
  - Resolução → Data da sessão que aprovou
  - PPP → Data da aprovação pelo conselho escolar

---

## 📅 Datas de Vigência

### **Data de Publicação**
- **O que é**: Data da publicação oficial do documento
- **Quando preencher**: Para leis, decretos, portarias com data oficial

### **Data de Vigência**
- **O que é**: Data a partir da qual o documento entra em vigor
- **Diferença da publicação**: Pode ser posterior à publicação
- **Exemplo**: Lei publicada em 15/01/2024 com vigência a partir de 01/02/2024

---

## 👁️ Controles de Visibilidade

### **Visível para Escolas**
- **Marcar SIM quando**: Diretores, coordenadores e professores precisam acessar
- **Exemplos**:
  - ✅ Calendário Letivo
  - ✅ Orientações Pedagógicas
  - ✅ Formulários de Matrícula
  - ❌ Documentos financeiros confidenciais

### **Visível para SME**
- **Marcar SIM quando**: Equipe da Secretaria Municipal precisa acessar
- **Exemplos**:
  - ✅ Relatórios de gestão
  - ✅ Documentos administrativos
  - ✅ Normativas internas

### **Visível para Comunidade**
- **Marcar SIM quando**: Deve ser transparente ao público (Lei de Acesso à Informação)
- **Exemplos**:
  - ✅ Leis municipais
  - ✅ Relatórios públicos
  - ✅ Calendário escolar
  - ❌ Dados de alunos (LGPD)
  - ❌ Processos disciplinares

---

## 💡 Dicas para o Assistente de IA

### Como o sistema usa essas informações:

1. **Busca Semântica Melhorada**
   - Domínio/Subdomínio direcionam a busca para contextos corretos
   - Ano filtra resultados para período relevante
   - Unidade específica retorna documentos da escola certa

2. **Exemplos de Perguntas que o Assistente Responde Melhor**:
   - "Qual é o calendário letivo de 2024?" → Usa CALENDÁRIO + ano 2024
   - "Como fazer matrícula na EMEF João Silva?" → Usa ADMINISTRATIVO + Matrícula + unidade específica
   - "Qual foi o IDEB de 2023 da rede?" → Usa INDICADORES + IDEB + ano 2023
   - "Quais são as leis sobre educação inclusiva?" → Usa REGULAMENTAÇÃO + Legislação + busca por "inclusiva"

3. **Priorização de Resultados**:
   - Documentos mais recentes (ano)
   - Versões mais atualizadas (versão)
   - Contexto específico quando disponível (unidade)

---

## ✅ Checklist de Preenchimento

Antes de finalizar o cadastro, verifique:

- [ ] Nome descritivo e oficial
- [ ] Descrição clara do conteúdo
- [ ] Tipo correto selecionado
- [ ] Domínio apropriado ao tema
- [ ] Subdomínio específico (quando disponível)
- [ ] Ano de referência (se aplicável)
- [ ] Unidade educacional (apenas se específico)
- [ ] Visibilidade configurada corretamente
- [ ] Datas de publicação/vigência (se aplicável)

---

## 🎯 Exemplos Práticos Completos

### Exemplo 1: Lei Municipal
```
Nome: Lei Municipal 456/2024 - Diretrizes da Educação Infantil
Descrição: Estabelece diretrizes para a educação infantil na rede municipal
Tipo: LAW
Domínio: REGULAMENTAÇÃO
Subdomínio: Legislação Municipal
Ano: 2024
Versão: 1.0
Unidade: [vazio - aplica-se a toda rede]
Data Publicação: 15/03/2024
Data Vigência: 01/04/2024
Data Aprovação: 10/03/2024
Visível para: Escolas ✓, SME ✓, Comunidade ✓
```

### Exemplo 2: Calendário Escolar
```
Nome: Calendário Letivo 2024 - Rede Municipal
Descrição: Calendário oficial do ano letivo 2024 com datas de aulas, feriados e recessos
Tipo: MANUAL
Domínio: CALENDÁRIO
Subdomínio: Ano Letivo
Ano: 2024
Versão: 1.0
Unidade: [vazio]
Data Aprovação: 20/12/2023
Visível para: Escolas ✓, SME ✓, Comunidade ✓
```

### Exemplo 3: Relatório IDEB Específico
```
Nome: Relatório IDEB 2023 - EMEF Machado de Assis
Descrição: Análise detalhada dos resultados do IDEB 2023 da escola
Tipo: REPORT
Domínio: INDICADORES_EDUCACIONAIS
Subdomínio: IDEB
Ano: 2023
Versão: 1.0
Unidade: EMEF Machado de Assis
Data Aprovação: 05/10/2023
Visível para: Escolas ✓, SME ✓, Comunidade ✓
```

### Exemplo 4: Manual Interno
```
Nome: Procedimento de Matrícula 2024
Descrição: Guia passo a passo para realização de matrículas na rede municipal
Tipo: MANUAL
Domínio: ADMINISTRATIVO
Subdomínio: Processos de Matrícula
Ano: 2024
Versão: 2.1
Unidade: [vazio]
Data Aprovação: 10/11/2023
Visível para: Escolas ✓, SME ✓, Comunidade ✗
```

---

**Última atualização**: 16/01/2026
