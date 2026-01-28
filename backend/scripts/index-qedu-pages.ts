/**
 * INDEXADOR DE PÁGINAS QEDU - Saquarema
 * 
 * Extrai conteúdo estruturado das páginas do QEdu sobre o município:
 * - http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/ideb/escolas
 * - http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/censo-escolar
 * - http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/aprendizado
 * - http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas
 * - E outras páginas do QEdu
 * 
 * Este conteúdo será usado como fonte de consulta direta, sem necessidade de Excel.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

// Páginas do QEdu para indexar
const QEDU_PAGES = [
  {
    url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema',
    subdomain: 'VISAO_GERAL',
    title: 'Visão Geral do Município',
  },
  {
    url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/ideb/escolas',
    subdomain: 'IDEB',
    title: 'IDEB por Escola',
  },
  {
    url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/censo-escolar',
    subdomain: 'MATRICULAS',
    title: 'Censo Escolar - Matrículas',
  },
  {
    url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/aprendizado',
    subdomain: 'SAEB',
    title: 'Aprendizado - SAEB',
  },
  {
    url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/taxas-rendimento',
    subdomain: 'TAXA_RENDIMENTO',
    title: 'Taxas de Rendimento',
  },
];

interface PageContent {
  url: string;
  title: string;
  subdomain: string;
  textContent: string;
  structuredData: any;
}

// Extrair conteúdo de página QEdu
async function extractQEduPage(url: string): Promise<string> {
  try {
    log(`   📡 Baixando: ${url}`, 'yellow');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const content: string[] = [];

    // Cabeçalho da página
    content.push('═══════════════════════════════════════════════════════════');
    
    // Título da página
    const pageTitle = $('h1').first().text().trim() || $('title').text().trim();
    if (pageTitle) {
      content.push(`PÁGINA: ${pageTitle}`);
    }

    // Informações do município
    content.push('MUNICÍPIO: Saquarema-RJ (Código IBGE: 3305505)');
    content.push('FONTE: QEdu - Dados Educacionais');
    content.push(`URL: ${url}`);
    content.push('═══════════════════════════════════════════════════════════\n');

    // Remover scripts, styles, e elementos não relevantes
    $('script, style, nav, footer, .ad, .advertisement').remove();

    // Extrair texto de seções importantes
    $('section, article, .content, .main, main').each((_, element) => {
      const sectionTitle = $(element).find('h2, h3').first().text().trim();
      if (sectionTitle) {
        content.push(`\n━━━ ${sectionTitle} ━━━\n`);
      }

      // Extrair parágrafos
      $(element).find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text.length > 20) {
          content.push(text);
        }
      });

      // Extrair listas
      $(element).find('ul, ol').each((_, list) => {
        $(list).find('li').each((_, li) => {
          const text = $(li).text().trim();
          if (text.length > 5) {
            content.push(`  • ${text}`);
          }
        });
      });

      // Extrair tabelas
      $(element).find('table').each((_, table) => {
        content.push('\n【 TABELA 】');
        
        // Cabeçalhos
        const headers: string[] = [];
        $(table).find('thead th, tr:first-child th').each((_, th) => {
          headers.push($(th).text().trim());
        });
        
        if (headers.length > 0) {
          content.push(`Colunas: ${headers.join(' | ')}`);
        }

        // Dados
        $(table).find('tbody tr, tr').slice(headers.length > 0 ? 1 : 0).each((idx, tr) => {
          const cells: string[] = [];
          $(tr).find('td, th').each((_, cell) => {
            cells.push($(cell).text().trim());
          });
          
          if (cells.length > 0 && cells.some(c => c.length > 0)) {
            if (headers.length === cells.length) {
              content.push(`\nRegistro ${idx + 1}:`);
              headers.forEach((header, i) => {
                if (cells[i]) {
                  content.push(`  ${header}: ${cells[i]}`);
                }
              });
            } else {
              content.push(`  ${cells.join(' | ')}`);
            }
          }
        });
        
        content.push('');
      });

      // Extrair divs com números/estatísticas
      $(element).find('.stat, .number, .metric, .card').each((_, div) => {
        const text = $(div).text().trim();
        if (text.length > 5 && text.length < 200) {
          content.push(`  📊 ${text}`);
        }
      });
    });

    // Se não encontrou conteúdo estruturado, pegar todo o texto do body
    if (content.length < 10) {
      const bodyText = $('body').text()
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
      
      if (bodyText.length > 100) {
        content.push('\n━━━ CONTEÚDO DA PÁGINA ━━━\n');
        content.push(bodyText);
      }
    }

    const finalText = content.join('\n');
    log(`   ✅ Extraído: ${finalText.length.toLocaleString()} caracteres`, 'green');
    
    return finalText;
    
  } catch (error: any) {
    log(`   ❌ Erro ao extrair: ${error.message}`, 'red');
    throw error;
  }
}

// Criar chunks do conteúdo
function createChunks(text: string, metadata: { title: string; subdomain: string }): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1800;
  
  const sections = text.split(/━━━[^━]+━━━/);
  
  const header = `╔═══════════════════════════════════════════════════════╗
║ QEdu - ${metadata.title}
║ Município: Saquarema-RJ (IBGE: 3305505)
║ Fonte: QEdu.org.br
╚═══════════════════════════════════════════════════════╝

`;

  let currentChunk = header;
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxChunkSize) {
        if (currentChunk.length > header.length + 50) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = header + line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
  }
  
  if (currentChunk.length > header.length + 50) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 200);
}

// Gerar embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

// Deletar documento existente
async function deleteExistingDocument(url: string): Promise<void> {
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('file_url', url);

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      const { data: versions } = await supabase
        .from('document_versions')
        .select('id')
        .eq('document_id', doc.id);

      if (versions) {
        for (const version of versions) {
          const { data: chunks } = await supabase
            .from('document_chunks')
            .select('id')
            .eq('document_version_id', version.id);

          if (chunks) {
            for (const chunk of chunks) {
              await supabase
                .from('document_embeddings')
                .delete()
                .eq('document_chunk_id', chunk.id);
            }
          }

          await supabase
            .from('document_chunks')
            .delete()
            .eq('document_version_id', version.id);
        }

        await supabase
          .from('document_versions')
          .delete()
          .eq('document_id', doc.id);
      }

      await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
    }
    log(`   🗑️  Documento existente deletado`, 'yellow');
  }
}

// Processar uma página do QEdu
async function processQEduPage(pageInfo: typeof QEDU_PAGES[0]): Promise<void> {
  log(`\n📄 ${pageInfo.title}`, 'cyan');
  log(`   URL: ${pageInfo.url}`, 'blue');

  try {
    // 1. Deletar documento existente se houver
    await deleteExistingDocument(pageInfo.url);

    // 2. Extrair conteúdo
    const pageContent = await extractQEduPage(pageInfo.url);
    
    if (pageContent.length < 200) {
      log(`   ⚠️  Conteúdo muito curto - pulando`, 'yellow');
      return;
    }

    // 3. Criar chunks
    const chunks = createChunks(pageContent, {
      title: pageInfo.title,
      subdomain: pageInfo.subdomain,
    });
    
    log(`   📦 Chunks criados: ${chunks.length}`, 'blue');

    if (chunks.length === 0) {
      log(`   ⚠️  Nenhum chunk criado - pulando`, 'yellow');
      return;
    }

    // 4. Criar documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: `qedu_${pageInfo.subdomain.toLowerCase()}_saquarema.html`,
        document_type: 'OTHER',
        file_url: pageInfo.url,
        status: 'ACTIVE',
        domain: 'INDICADORES_EDUCACIONAIS',
        subdomain: pageInfo.subdomain,
        metadata_year: new Date().getFullYear(),
        keywords: ['qedu', 'saquarema', pageInfo.subdomain.toLowerCase(), 'web'],
      })
      .select()
      .single();

    if (docError) throw docError;
    log(`   ✅ Documento criado: ${document.id}`, 'green');

    // 5. Criar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        status: 'PROCESSING',
        extracted_text_length: pageContent.length,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 6. Processar chunks com embeddings
    log(`   🔄 Indexando chunks...`, 'yellow');
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      const { data: chunk, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          content: chunkContent,
          chunk_index: i,
          metadata: {
            tipo: 'qedu_web',
            subdomain: pageInfo.subdomain,
            fonte: 'QEdu',
          },
        })
        .select()
        .single();

      if (chunkError) throw chunkError;

      const embedding = await generateEmbedding(chunkContent);

      const { error: embError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
          tokens_used: Math.ceil(chunkContent.length / 4),
        });

      if (embError) throw embError;
    }

    // 7. Atualizar versão
    await supabase
      .from('document_versions')
      .update({
        status: 'COMPLETED',
        indexed: true,
      })
      .eq('id', version.id);

    log(`   ✅ Página indexada! (${chunks.length} chunks)`, 'green');
    
  } catch (error: any) {
    log(`   ❌ Erro: ${error.message}`, 'red');
  }
}

// Main
async function main() {
  log('\n🚀 INDEXADOR DE PÁGINAS QEDU - SAQUAREMA\n', 'cyan');

  let success = 0;
  let errors = 0;

  for (const page of QEDU_PAGES) {
    try {
      await processQEduPage(page);
      success++;
      
      // Pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      errors++;
    }
  }

  log('\n═══════════════════════════════════════', 'cyan');
  log(`✅ Páginas indexadas: ${success}/${QEDU_PAGES.length}`, 'green');
  log(`❌ Erros: ${errors}`, errors > 0 ? 'red' : 'blue');
  log('═══════════════════════════════════════\n', 'cyan');

  log('💡 Agora o assistente pode responder perguntas usando conteúdo direto do QEdu!', 'magenta');
  log('📝 Exemplos:', 'cyan');
  log('   - "Quais escolas têm melhor IDEB em Saquarema?"', 'blue');
  log('   - "Quantos professores tem no município?"', 'blue');
  log('   - "Como está o aprendizado em matemática?"', 'blue');
}

main().catch(console.error);
