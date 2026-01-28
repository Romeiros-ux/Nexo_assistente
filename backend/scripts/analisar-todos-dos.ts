/**
 * Script para analisar todos os Diários Oficiais baixados
 * Extrai estatísticas de conteúdo para definir estratégia de indexação
 */

import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const DOWNLOAD_DIR = path.resolve(__dirname, './downloads');

interface AtoEncontrado {
  tipo: string;
  numero?: string;
  edicao: string;
}

interface EstatisticasEdicao {
  filename: string;
  edicao: string;
  ano: string;
  paginas: number;
  caracteres: number;
  decretos: number;
  portarias: number;
  leis: number;
  editais: number;
  contratos: number;
  atasRegistroPreco: number;
  termosAditivos: number;
  termoRescisao: number;
  erros: string[];
}

interface EstatisticasGerais {
  totalEdicoes: number;
  totalPaginas: number;
  totalCaracteres: number;
  mediaPaginasPorEdicao: number;
  mediaCaracteresPorEdicao: number;
  totalDecretos: number;
  totalPortarias: number;
  totalLeis: number;
  totalEditais: number;
  totalContratos: number;
  totalAtasRP: number;
  totalTermosAditivos: number;
  totalTermosRescisao: number;
  edicoesMaisLongas: Array<{ edicao: string; paginas: number }>;
  edicoesMaisCurtas: Array<{ edicao: string; paginas: number }>;
  distribuicaoTiposAtos: {
    [key: string]: number;
  };
}

async function extrairEstatisticas(pdfPath: string, filename: string): Promise<EstatisticasEdicao> {
  const match = filename.match(/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf/);
  const edicao = match ? match[1] : 'desconhecido';
  const ano = match ? match[2] : 'desconhecido';

  const stats: EstatisticasEdicao = {
    filename,
    edicao,
    ano,
    paginas: 0,
    caracteres: 0,
    decretos: 0,
    portarias: 0,
    leis: 0,
    editais: 0,
    contratos: 0,
    atasRegistroPreco: 0,
    termosAditivos: 0,
    termoRescisao: 0,
    erros: []
  };

  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);

    stats.paginas = data.numpages;
    stats.caracteres = data.text.length;

    const texto = data.text;

    // Contar atos
    const decretos = texto.match(/DECRETO\s+N[º°]?\s*\d+/gi);
    const portarias = texto.match(/PORTARIA\s+N[º°]?\s*\d+/gi);
    const leis = texto.match(/LEI\s+N[º°]?\s*\d+/gi);
    const editais = texto.match(/EDITAL\s+[Nn][º°]?\s*\d+/gi);
    
    // Contratos e termos
    const contratos = texto.match(/EXTRATO\s+DO\s+CONTRATO\s*N[º°]?\s*\d+/gi);
    const atasRP = texto.match(/EXTRATO\s+DA\s+ATA\s+DE\s+REGISTRO\s+DE\s+PRE[ÇC]OS?\s*N[º°]?\s*\d+/gi);
    const termosAditivos = texto.match(/TERMO\s+ADITIVO|ADITIVO\s+N[º°]?\s*\d+/gi);
    const termosRescisao = texto.match(/TERMO\s+DE\s+RESCIS[ÃA]O/gi);

    stats.decretos = decretos?.length || 0;
    stats.portarias = portarias?.length || 0;
    stats.leis = leis?.length || 0;
    stats.editais = editais?.length || 0;
    stats.contratos = contratos?.length || 0;
    stats.atasRegistroPreco = atasRP?.length || 0;
    stats.termosAditivos = termosAditivos?.length || 0;
    stats.termoRescisao = termosRescisao?.length || 0;

  } catch (error: any) {
    stats.erros.push(`Erro ao processar: ${error.message}`);
  }

  return stats;
}

async function analisarTodosDiarios() {
  console.log('📊 Analisando todos os Diários Oficiais...\n');

  try {
    // Listar todos os PDFs
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('_assinado.pdf'))
      .sort();

    console.log(`📄 Encontrados ${files.length} PDFs para análise\n`);

    const todasEstatisticas: EstatisticasEdicao[] = [];

    // Processar cada PDF
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.join(DOWNLOAD_DIR, filename);
      
      console.log(`⚙️  [${i + 1}/${files.length}] Analisando: ${filename}`);
      
      const stats = await extrairEstatisticas(filepath, filename);
      todasEstatisticas.push(stats);

      // Mostrar resumo
      const atos = stats.decretos + stats.portarias + stats.leis + stats.editais;
      const contratos = stats.contratos + stats.atasRegistroPreco;
      console.log(`   📄 ${stats.paginas}p | ${stats.caracteres}c | Atos: ${atos} | Contratos: ${contratos}`);
    }

    console.log('\n');

    // Calcular estatísticas gerais
    const estatisticasGerais: EstatisticasGerais = {
      totalEdicoes: todasEstatisticas.length,
      totalPaginas: todasEstatisticas.reduce((sum, s) => sum + s.paginas, 0),
      totalCaracteres: todasEstatisticas.reduce((sum, s) => sum + s.caracteres, 0),
      mediaPaginasPorEdicao: 0,
      mediaCaracteresPorEdicao: 0,
      totalDecretos: todasEstatisticas.reduce((sum, s) => sum + s.decretos, 0),
      totalPortarias: todasEstatisticas.reduce((sum, s) => sum + s.portarias, 0),
      totalLeis: todasEstatisticas.reduce((sum, s) => sum + s.leis, 0),
      totalEditais: todasEstatisticas.reduce((sum, s) => sum + s.editais, 0),
      totalContratos: todasEstatisticas.reduce((sum, s) => sum + s.contratos, 0),
      totalAtasRP: todasEstatisticas.reduce((sum, s) => sum + s.atasRegistroPreco, 0),
      totalTermosAditivos: todasEstatisticas.reduce((sum, s) => sum + s.termosAditivos, 0),
      totalTermosRescisao: todasEstatisticas.reduce((sum, s) => sum + s.termoRescisao, 0),
      edicoesMaisLongas: [],
      edicoesMaisCurtas: [],
      distribuicaoTiposAtos: {}
    };

    estatisticasGerais.mediaPaginasPorEdicao = estatisticasGerais.totalPaginas / estatisticasGerais.totalEdicoes;
    estatisticasGerais.mediaCaracteresPorEdicao = estatisticasGerais.totalCaracteres / estatisticasGerais.totalEdicoes;

    // Top 5 mais longas e mais curtas
    const ordenadoPorPaginas = [...todasEstatisticas].sort((a, b) => b.paginas - a.paginas);
    estatisticasGerais.edicoesMaisLongas = ordenadoPorPaginas.slice(0, 5).map(s => ({
      edicao: `${s.edicao}/${s.ano}`,
      paginas: s.paginas
    }));
    estatisticasGerais.edicoesMaisCurtas = ordenadoPorPaginas.slice(-5).map(s => ({
      edicao: `${s.edicao}/${s.ano}`,
      paginas: s.paginas
    }));

    // Distribuição de tipos de atos
    estatisticasGerais.distribuicaoTiposAtos = {
      'Decretos': estatisticasGerais.totalDecretos,
      'Portarias': estatisticasGerais.totalPortarias,
      'Leis': estatisticasGerais.totalLeis,
      'Editais': estatisticasGerais.totalEditais,
      'Contratos': estatisticasGerais.totalContratos,
      'Atas de Registro de Preços': estatisticasGerais.totalAtasRP,
      'Termos Aditivos': estatisticasGerais.totalTermosAditivos,
      'Termos de Rescisão': estatisticasGerais.totalTermosRescisao
    };

    // Exibir relatório
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ESTATÍSTICAS GERAIS - DIÁRIO OFICIAL DE SAQUAREMA');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📈 VOLUME TOTAL:');
    console.log(`   • Edições analisadas: ${estatisticasGerais.totalEdicoes}`);
    console.log(`   • Total de páginas: ${estatisticasGerais.totalPaginas}`);
    console.log(`   • Total de caracteres: ${estatisticasGerais.totalCaracteres.toLocaleString()}`);
    console.log(`   • Média de páginas/edição: ${estatisticasGerais.mediaPaginasPorEdicao.toFixed(1)}`);
    console.log(`   • Média de caracteres/edição: ${estatisticasGerais.mediaCaracteresPorEdicao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`);

    console.log('\n📋 TIPOS DE ATOS ENCONTRADOS:');
    const totalAtos = Object.values(estatisticasGerais.distribuicaoTiposAtos).reduce((a, b) => a + b, 0);
    Object.entries(estatisticasGerais.distribuicaoTiposAtos).forEach(([tipo, count]) => {
      const percentual = ((count / totalAtos) * 100).toFixed(1);
      console.log(`   • ${tipo}: ${count} (${percentual}%)`);
    });

    console.log('\n🏆 EDIÇÕES MAIS LONGAS:');
    estatisticasGerais.edicoesMaisLongas.forEach((e, i) => {
      console.log(`   ${i + 1}. Edição ${e.edicao}: ${e.paginas} páginas`);
    });

    console.log('\n📄 EDIÇÕES MAIS CURTAS:');
    estatisticasGerais.edicoesMaisCurtas.forEach((e, i) => {
      console.log(`   ${i + 1}. Edição ${e.edicao}: ${e.paginas} páginas`);
    });

    // Salvar estatísticas detalhadas
    const outputPath = path.join(DOWNLOAD_DIR, 'estatisticas-completas.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      estatisticasGerais,
      estatisticasPorEdicao: todasEstatisticas
    }, null, 2));

    console.log(`\n💾 Estatísticas completas salvas em: ${outputPath}`);

    // Gerar relatório markdown
    const markdownPath = path.join(__dirname, 'ANALISE-DIARIOS-OFICIAIS.md');
    const markdown = gerarRelatorioMarkdown(estatisticasGerais, todasEstatisticas);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`📝 Relatório markdown gerado: ${markdownPath}`);

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

function gerarRelatorioMarkdown(gerais: EstatisticasGerais, detalhes: EstatisticasEdicao[]): string {
  return `# Análise dos Diários Oficiais de Saquarema

**Data da Análise:** ${new Date().toLocaleDateString('pt-BR')}  
**Total de Edições:** ${gerais.totalEdicoes}  
**Período:** Edições ${detalhes[detalhes.length - 1].edicao} até ${detalhes[0].edicao}

---

## 📊 Estatísticas Gerais

### Volume de Conteúdo
- **Total de páginas:** ${gerais.totalPaginas.toLocaleString()}
- **Total de caracteres:** ${gerais.totalCaracteres.toLocaleString()}
- **Média de páginas por edição:** ${gerais.mediaPaginasPorEdicao.toFixed(1)}
- **Média de caracteres por edição:** ${gerais.mediaCaracteresPorEdicao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}

### Distribuição de Atos

| Tipo de Ato | Quantidade | Percentual |
|-------------|------------|------------|
${Object.entries(gerais.distribuicaoTiposAtos).map(([tipo, count]) => {
  const total = Object.values(gerais.distribuicaoTiposAtos).reduce((a, b) => a + b, 0);
  const pct = ((count / total) * 100).toFixed(1);
  return `| ${tipo} | ${count} | ${pct}% |`;
}).join('\n')}

---

## 🎯 Insights para Implementação

### 1. **Predominância de Contratos e Licitações**
- **${gerais.totalContratos + gerais.totalAtasRP}** extratos de contratos e atas de registro de preços
- **${((gerais.totalContratos + gerais.totalAtasRP) / Object.values(gerais.distribuicaoTiposAtos).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%** do conteúdo total
- **Recomendação:** Criar subdomain **CONTRATOS_LICITACOES** como prioritário

### 2. **Volume de Atos Administrativos**
- **${gerais.totalPortarias}** portarias (nomeações, designações)
- **${gerais.totalDecretos}** decretos
- **Recomendação:** Subdomain **ATOS_ADMINISTRATIVOS** para portarias e decretos

### 3. **Legislação Municipal**
- **${gerais.totalLeis}** leis encontradas
- **Recomendação:** Subdomain **LEGISLACAO** para leis e decretos legislativos

### 4. **Editais e Chamamentos Públicos**
- **${gerais.totalEditais}** editais
- **Recomendação:** Subdomain **EDITAIS** para licitações e concursos

---

## 📈 Edições Mais Relevantes

### Edições Mais Longas (Maior Volume de Conteúdo)
${gerais.edicoesMaisLongas.map((e, i) => `${i + 1}. **Edição ${e.edicao}**: ${e.paginas} páginas`).join('\n')}

### Edições Mais Curtas
${gerais.edicoesMaisCurtas.map((e, i) => `${i + 1}. **Edição ${e.edicao}**: ${e.paginas} páginas`).join('\n')}

---

## 🏗️ Proposta de Estrutura de Subdomains

\`\`\`
DIARIO_OFICIAL/
├── CONTRATOS_LICITACOES (${gerais.totalContratos + gerais.totalAtasRP} documentos - 🔥 PRIORITÁRIO)
│   ├── Extratos de contratos
│   ├── Atas de registro de preços
│   └── Termos aditivos
│
├── ATOS_ADMINISTRATIVOS (${gerais.totalPortarias + gerais.totalDecretos} documentos)
│   ├── Portarias (nomeações, exonerações)
│   └── Decretos executivos
│
├── LEGISLACAO (${gerais.totalLeis} documentos)
│   ├── Leis municipais
│   └── Decretos legislativos
│
└── EDITAIS (${gerais.totalEditais} documentos)
    ├── Editais de licitação
    └── Editais de concurso
\`\`\`

---

## 💡 Recomendações para Indexação

### Estratégia de Upload
1. **Documento único por edição** (RECOMENDADO)
   - ✅ Mais simples de implementar
   - ✅ Mantém contexto completo da publicação
   - ✅ Facilita rastreamento temporal ("publicado na edição X")
   - ⚠️ Chunks podem misturar tipos de atos

2. **Múltiplos documentos por edição** (Avançado)
   - ✅ Roteamento mais preciso por tipo de ato
   - ✅ Melhor precisão em buscas específicas
   - ⚠️ Mais complexo de implementar
   - ⚠️ Requer parsing estruturado do PDF

### Metadata Sugerida
- **edicao:** Número da edição (ex: 1833)
- **ano:** Ano da publicação (ex: 8 = 2026)
- **data_publicacao:** Data completa
- **tipos_atos:** Array com tipos encontrados
- **total_paginas:** Número de páginas
- **secretarias_mencionadas:** Array de secretarias

### Roteamento Inteligente
\`\`\`typescript
// Exemplos de queries e roteamento esperado

"Contrato 191/2025" → CONTRATOS_LICITACOES
"Portaria 38" → ATOS_ADMINISTRATIVOS
"Decreto 3159" → ATOS_ADMINISTRATIVOS ou LEGISLACAO
"Edital de licitação" → EDITAIS
"Lei municipal sobre" → LEGISLACAO
\`\`\`

---

## 📅 Próximos Passos

1. ✅ Download completo (${gerais.totalEdicoes} edições)
2. ✅ Análise estatística
3. ⏳ Atualizar RELATORIO-DIARIO-OFICIAL.md com dados reais
4. ⏳ Implementar domain DIARIO_OFICIAL com subdomains
5. ⏳ Criar script de upload em lote
6. ⏳ Testar queries e validar roteamento
7. ⏳ Implementar sistema de atualização automática
`;
}

analisarTodosDiarios();
