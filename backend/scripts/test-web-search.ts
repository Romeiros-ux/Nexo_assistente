/**
 * SIMULADOR DE BUSCA - Testar conteúdo dos sites
 * 
 * Simula como o assistente busca informações apenas nos sites web indexados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function searchWebContent(keywords: string[]): Promise<void> {
  log('\n🔍 SIMULAÇÃO DE BUSCA NO ASSISTENTE', 'cyan');
  log(`\n📝 Pergunta: "Qual o IDEB dos anos iniciais de 2023?"`, 'magenta');
  log(`🎯 Buscando apenas em: Páginas Web (QEdu)\n`, 'yellow');

  // Buscar apenas documentos web (OTHER) com nome qedu
  const { data: webDocs, error: docsError } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      subdomain,
      file_url,
      document_versions (
        id,
        document_chunks (
          id,
          content,
          chunk_index
        )
      )
    `)
    .eq('document_type', 'OTHER')
    .like('name', '%qedu%');

  if (docsError) {
    log(`❌ Erro: ${docsError.message}`, 'red');
    return;
  }

  if (!webDocs || webDocs.length === 0) {
    log('❌ Nenhum documento web encontrado!', 'red');
    return;
  }

  log(`📚 Total de páginas web indexadas: ${webDocs.length}`, 'blue');
  
  // Filtrar chunks que mencionam os termos de busca
  const relevantChunks: any[] = [];
  
  for (const doc of webDocs) {
    if (!doc.document_versions || doc.document_versions.length === 0) continue;
    
    const version = doc.document_versions[0];
    if (!version.document_chunks) continue;

    for (const chunk of version.document_chunks) {
      const contentLower = chunk.content.toLowerCase();
      
      // Verificar se menciona os termos relevantes
      const hasIdeb = contentLower.includes('ideb');
      const hasAnosIniciais = 
        contentLower.includes('anos iniciais') ||
        contentLower.includes('1º ao 5º') ||
        contentLower.includes('ai') ||
        contentLower.includes('1° ao 5°');
      const has2023 = contentLower.includes('2023');

      if (hasIdeb && (hasAnosIniciais || has2023)) {
        relevantChunks.push({
          docName: doc.name,
          subdomain: doc.subdomain,
          url: doc.file_url,
          chunkIndex: chunk.chunk_index,
          content: chunk.content,
          score: (hasIdeb ? 1 : 0) + (hasAnosIniciais ? 2 : 0) + (has2023 ? 1 : 0),
        });
      }
    }
  }

  // Ordenar por relevância
  relevantChunks.sort((a, b) => b.score - a.score);

  log(`\n✅ Chunks relevantes encontrados: ${relevantChunks.length}`, 'green');
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');

  // Mostrar top 5 chunks mais relevantes
  const topChunks = relevantChunks.slice(0, 5);
  
  for (let i = 0; i < topChunks.length; i++) {
    const chunk = topChunks[i];
    
    log(`\n📄 RESULTADO ${i + 1}`, 'yellow');
    log(`   Fonte: ${chunk.docName}`, 'blue');
    log(`   Subdomínio: ${chunk.subdomain}`, 'blue');
    log(`   URL: ${chunk.url}`, 'cyan');
    log(`   Chunk: ${chunk.chunkIndex}`, 'blue');
    log(`   Relevância: ${chunk.score}/4`, 'magenta');
    log(`\n   📋 CONTEÚDO:`, 'green');
    
    // Mostrar primeiros 800 caracteres do conteúdo
    const preview = chunk.content.substring(0, 800);
    const lines = preview.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        log(`      ${line}`, 'reset');
      }
    }
    
    if (chunk.content.length > 800) {
      log(`\n      ... (${chunk.content.length - 800} caracteres restantes)`, 'yellow');
    }
    
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  }

  // Análise dos resultados
  log(`\n📊 ANÁLISE DOS RESULTADOS:`, 'magenta');
  
  const hasDirect2023 = relevantChunks.some(c => 
    c.content.toLowerCase().includes('2023') && 
    c.content.toLowerCase().includes('anos iniciais')
  );
  
  const hasIdebValue = relevantChunks.some(c => {
    const content = c.content.toLowerCase();
    return /ideb[:\s]+\d+[.,]\d+/.test(content);
  });

  if (hasDirect2023) {
    log(`   ✅ Encontrou menção direta a IDEB 2023 Anos Iniciais`, 'green');
  } else {
    log(`   ⚠️  Não encontrou menção DIRETA a 2023 + Anos Iniciais`, 'yellow');
  }

  if (hasIdebValue) {
    log(`   ✅ Encontrou valores numéricos de IDEB`, 'green');
  } else {
    log(`   ⚠️  Não encontrou valores numéricos claros`, 'yellow');
  }

  log(`\n💡 RECOMENDAÇÃO:`, 'cyan');
  if (!hasDirect2023 || !hasIdebValue) {
    log(`   ➡️  Sistema deveria complementar com dados dos arquivos Excel`, 'yellow');
    log(`   ➡️  Excel tem dados detalhados por ano e etapa`, 'yellow');
  } else {
    log(`   ✅ Conteúdo web suficiente para responder!`, 'green');
  }
}

async function main() {
  await searchWebContent(['ideb', 'anos iniciais', '2023']);
  log('\n');
}

main().catch(console.error);
