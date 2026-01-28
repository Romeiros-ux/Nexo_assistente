/**
 * UNIFIED KNOWLEDGE BASE INDEXER
 * 
 * Script unificado que combina:
 * 1. Processamento de documentos PENDING no banco
 * 2. Web scraping de sites governamentais
 * 3. Download e processamento de PDFs
 * 
 * Funcionalidades:
 * - ✅ Detecção de duplicatas por URL
 * - ✅ OCR automático para PDFs escaneados
 * - ✅ Extração de conteúdo HTML
 * - ✅ Descoberta de PDFs linkados
 * - ✅ Chunking + Embeddings
 * - ✅ Metadata enriquecida
 * 
 * Uso:
 * npx tsx backend/scripts/unified-knowledge-indexer.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { createWorker } from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import { URL } from 'url';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Lista de URLs para crawling (sites + PDFs)
const URLS_TO_CRAWL = [
  // PDFs diretos
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/01/LO-1081-2010.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2022/04/LO-2232-2022.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2024/12/LO-2667-2024.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/02/LO-97-1993.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2025/06/plano-municipal-de-educacao-saquarema.pdf',
  'https://www.saquarema.rj.gov.br/wp-content/uploads/2022/03/lista-de-ceps-saquarema.pdf',
  
  // Sites para scraping
  'https://dos.saquarema.rj.gov.br/',
  'https://www.saquarema.rj.gov.br/legislacao/',
  'https://transparencia.saquarema.rj.gov.br/',
  'https://cidades.ibge.gov.br/brasil/rj/saquarema/panorama',
  'https://transparencia.saquarema.rj.gov.br/planejamento-e-orcamento/plano-plurianual-ppa/',
  'https://transparencia.saquarema.rj.gov.br/planejamento-e-orcamento/lei-orcamentaria-anual-loa/',
  'https://transparencia.saquarema.rj.gov.br/legislacao/leis-ordinarias/',
  'https://transparencia.saquarema.rj.gov.br/legislacao/lei-organica/',
  'https://transparencia.saquarema.rj.gov.br/legislacao/leis-complementares/',
  'https://transparencia.saquarema.rj.gov.br/planejamento-e-orcamento/lei-de-diretrizes-orcamentarias-ldo/',
  'https://transparencia.saquarema.rj.gov.br/planejamento-e-orcamento/estudos-e-estimativas/',
  'https://www.saquarema.rj.gov.br/planejamento-municipal/',
  'https://www.saquarema.rj.gov.br/',
  
  // QEdu - Dados Educacionais de Saquarema
  'https://qedu.org.br/municipio/3305505-saquarema/',
  'https://qedu.org.br/municipio/3305505-saquarema/ideb',
  'https://qedu.org.br/municipio/3305505-saquarema/pessoas',
  'https://qedu.org.br/municipio/3305505-saquarema/censo-escolar',
  'https://qedu.org.br/municipio/3305505-saquarema/aprendizado',
  'https://qedu.org.br/municipio/3305505-saquarema/explore',
  'https://qedu.org.br/municipio/3305505-saquarema/taxas-rendimento',
  'https://qedu.org.br/municipio/3305505-saquarema/distorcao-idade-serie',
  'https://qedu.org.br/municipio/3305505-saquarema/escolas-tecnicas',
  'https://qedu.org.br/municipio/3305505-saquarema/enem',
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

function splitIntoChunks(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  
  return chunks.filter(chunk => chunk.length > 50);
}

// ==========================================
// VERIFICAÇÃO DE DUPLICATAS
// ==========================================

async function documentExists(sourceUrl: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('file_url', sourceUrl)
    .maybeSingle();
  
  if (data) {
    log(`⏭️  Documento já existe: ${sourceUrl}`, 'yellow');
    return true;
  }
  
  return false;
}

// ==========================================
// PROCESSAMENTO DE PDF (com OCR)
// ==========================================

async function extractTextWithOCR(pdfBuffer: Buffer, docName: string): Promise<string> {
  log(`🔍 OCR detectado, processando: ${docName}`, 'yellow');
  
  try {
    // Converter Buffer para ArrayBuffer (correção do erro TypeScript)
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );
    
    const pngPages = await pdfToPng(arrayBuffer, {
      viewportScale: 2.0,
    });
    
    log(`📄 ${pngPages.length} páginas convertidas para imagem`, 'blue');
    
    const worker = await createWorker('por', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\r🔤 OCR: ${Math.round(m.progress * 100)}% `);
        }
      },
    });
    
    let fullText = '';
    
    for (let i = 0; i < pngPages.length; i++) {
      // Verificar se content existe (correção do erro TypeScript)
      if (!pngPages[i].content) {
        log(`⚠️ Página ${i + 1} sem conteúdo, pulando...`, 'yellow');
        continue;
      }
      
      const { data: { text } } = await worker.recognize(pngPages[i].content!);
      fullText += text + '\n\n';
      log(`✅ Página ${i + 1}/${pngPages.length} processada`, 'green');
    }
    
    await worker.terminate();
    
    log(`✅ OCR completo: ${fullText.length} caracteres extraídos`, 'green');
    return fullText;
    
  } catch (error) {
    log(`❌ Erro no OCR: ${error}`, 'red');
    throw error;
  }
}

async function processPDF(url: string): Promise<{ text: string; title: string } | null> {
  try {
    log(`\n📥 Baixando PDF: ${url}`, 'cyan');
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 60000,
    });
    
    const buffer = Buffer.from(response.data);
    log(`✅ PDF baixado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`, 'green');
    
    // Extrair nome do arquivo
    const title = url.split('/').pop()?.replace('.pdf', '') || 'documento';
    
    // Tentar extrair texto normal
    const pdfData = await pdfParse(buffer);
    let fullText = pdfData.text;
    
    // Se texto muito curto, usar OCR
    if (!fullText || fullText.trim().length < 100) {
      log(`⚠️ Pouco texto extraído (${fullText.length} chars), usando OCR...`, 'yellow');
      fullText = await extractTextWithOCR(buffer, title);
    }
    
    return { text: cleanText(fullText), title };
    
  } catch (error) {
    log(`❌ Erro ao processar PDF: ${error}`, 'red');
    return null;
  }
}

// ==========================================
// PROCESSAMENTO DE HTML
// ==========================================

async function extractHTMLContent(url: string): Promise<{ text: string; title: string; pdfLinks: string[] } | null> {
  try {
    log(`\n🌐 Acessando site: ${url}`, 'cyan');
    
    // Detectar se é QEdu (precisa de JavaScript)
    const needsJavaScript = url.includes('qedu.org.br');
    
    let html: string;
    
    if (needsJavaScript) {
      // Usar Puppeteer para sites com JavaScript
      log(`  🤖 Site dinâmico detectado, usando navegador headless...`, 'yellow');
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar um pouco para garantir que tudo carregou
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        html = await page.content();
        await browser.close();
        log(`  ✅ Conteúdo dinâmico carregado`, 'green');
      } catch (error) {
        await browser.close();
        throw error;
      }
    } else {
      // Usar axios para sites estáticos
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 30000,
      });
      html = response.data;
    }
    
    const $ = cheerio.load(html);
    
    // Extrair título
    const title = $('title').text() || $('h1').first().text() || url;
    
    // Remover scripts, styles, headers, footers, nav
    $('script, style, header, footer, nav, iframe, noscript, .ads, .advertisement').remove();
    
    // Estratégia de extração específica para QEdu
    let text = '';
    
    if (url.includes('qedu.org.br')) {
      // QEdu: extrair dados das tabelas e cards
      const dataPoints: string[] = [];
      
      // Tabelas
      $('table').each((_, table) => {
        const tableData: string[] = [];
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td, th').map((_, cell) => $(cell).text().trim()).get();
          if (cells.length > 0) {
            tableData.push(cells.join(' | '));
          }
        });
        if (tableData.length > 0) {
          dataPoints.push(tableData.join('\n'));
        }
      });
      
      // Cards/boxes de dados
      $('.card, .box, .metric, .indicator, .data-box, .info-box').each((_, el) => {
        const label = $(el).find('.label, .title, .name, h3, h4, strong').first().text().trim();
        const value = $(el).find('.value, .number, .percent, .data').first().text().trim();
        if (label && value) {
          dataPoints.push(`${label}: ${value}`);
        } else {
          const fullText = $(el).text().trim();
          if (fullText.length > 10 && fullText.length < 500) {
            dataPoints.push(fullText);
          }
        }
      });
      
      // Listas
      $('ul, ol').each((_, list) => {
        const items = $(list).find('li').map((_, li) => $(li).text().trim()).get();
        if (items.length > 0 && items.some(item => item.length > 5)) {
          dataPoints.push(items.join('\n'));
        }
      });
      
      // Parágrafos informativos
      $('p').each((_, p) => {
        const pText = $(p).text().trim();
        if (pText.length > 20 && pText.length < 1000) {
          dataPoints.push(pText);
        }
      });
      
      // Combinar todos os dados
      text = dataPoints.join('\n\n');
      
      // Se ainda estiver vazio, pegar todo o body
      if (!text || text.length < 100) {
        text = $('body').text();
      }
    } else {
      // Outros sites: estratégia padrão
      const mainContent = $('main, article, .content, #content, .post').first();
      const bodyText = mainContent.length > 0 ? mainContent.text() : $('body').text();
      text = bodyText;
    }
    
    text = cleanText(text);
    
    // Encontrar todos os links de PDF
    const pdfLinks: string[] = [];
    $('a[href*=".pdf"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          pdfLinks.push(absoluteUrl);
        } catch (e) {
          // Ignorar URLs inválidas
        }
      }
    });
    
    log(`✅ HTML extraído: ${text.length} chars, ${pdfLinks.length} PDFs encontrados`, 'green');
    
    return { text, title, pdfLinks };
    
  } catch (error: any) {
    log(`❌ Erro ao acessar site: ${error.message}`, 'red');
    return null;
  }
}

// ==========================================
// SALVAMENTO NO BANCO
// ==========================================

async function saveDocument(url: string, title: string, content: string, type: 'PDF' | 'WEB'): Promise<string | null> {
  try {
    // Verificar duplicata
    if (await documentExists(url)) {
      return null;
    }
    
    // 1. Criar documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: title,
        description: `Conteúdo extraído de: ${url}`,
        document_type: type === 'PDF' ? 'LAW' : 'OTHER',
        file_url: url,
        status: 'PENDING',
        metadata: { 
          source_url: url,
          source_type: type,
          crawled_at: new Date().toISOString() 
        },
      })
      .select('id')
      .single();
    
    if (docError || !document) {
      log(`❌ Erro ao criar documento: ${docError?.message}`, 'red');
      return null;
    }
    
    // 2. Criar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        version_number: 1,
        status: 'PROCESSING',
        extracted_text_length: content.length,
        extraction_method: type === 'PDF' ? 'OCR' : 'HTML',
        indexed: false,
      })
      .select('id')
      .single();
    
    if (versionError || !version) {
      log(`❌ Erro ao criar versão: ${versionError?.message}`, 'red');
      return null;
    }
    
    // 3. Criar chunks e embeddings
    const chunks = splitIntoChunks(content);
    log(`📦 Criando ${chunks.length} chunks...`, 'blue');
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      
      const { data: chunk, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          chunk_index: i,
          content: chunkContent,
          metadata: {
            document_name: title,
            document_type: type,
            source_url: url,
          },
        })
        .select('id')
        .single();
      
      if (chunkError || !chunk) {
        log(`❌ Erro ao criar chunk ${i}: ${chunkError?.message}`, 'red');
        continue;
      }
      
      // 4. Gerar embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunkContent,
        dimensions: 1536,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      const tokensUsed = embeddingResponse.usage.total_tokens;
      
      // 5. Salvar embedding
      const { error: embeddingError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding: embedding,
          model: 'text-embedding-3-large',
          tokens_used: tokensUsed,
        });
      
      if (embeddingError) {
        log(`❌ Erro ao salvar embedding ${i}: ${embeddingError.message}`, 'red');
      }
      
      process.stdout.write(`\r✅ Progresso: ${i + 1}/${chunks.length} chunks processados `);
    }
    
    console.log(); // Nova linha
    
    // 6. Marcar como indexed
    await supabase
      .from('document_versions')
      .update({ 
        indexed: true, 
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
      .eq('id', version.id);
    
    await supabase
      .from('documents')
      .update({ status: 'ACTIVE' })
      .eq('id', document.id);
    
    log(`✅ Documento salvo: ${title} (${chunks.length} chunks)`, 'green');
    return document.id;
    
  } catch (error) {
    log(`❌ Erro ao salvar: ${error}`, 'red');
    return null;
  }
}

// ==========================================
// PROCESSAMENTO DE DOCUMENTOS PENDING
// ==========================================

async function processPendingDocuments(): Promise<number> {
  log('\n📋 Processando documentos PENDING no banco...', 'magenta');
  
  const { data: pendingDocs, error } = await supabase
    .from('documents')
    .select('*, document_versions(*)')
    .eq('status', 'PENDING')
    .limit(50);
  
  if (error || !pendingDocs || pendingDocs.length === 0) {
    log('✅ Nenhum documento PENDING encontrado', 'green');
    return 0;
  }
  
  log(`📄 Encontrados ${pendingDocs.length} documentos PENDING`, 'blue');
  let processed = 0;
  
  for (const doc of pendingDocs) {
    // Se já tem source_url no metadata, pular (foi processado pelo crawler)
    if (doc.metadata?.source_url) {
      log(`⏭️  Pulando ${doc.name} (já processado pelo crawler)`, 'yellow');
      continue;
    }
    
    // Processar documento do Storage
    log(`\n📥 Processando: ${doc.name}`, 'cyan');
    
    // NOTA: Aqui você implementaria a lógica de baixar do Storage
    // Por enquanto, apenas marcamos como processado
    log(`⚠️ Documento ${doc.name} precisa ser baixado do Storage (não implementado)`, 'yellow');
  }
  
  return processed;
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================

async function main() {
  log('\n🚀 UNIFIED KNOWLEDGE BASE INDEXER', 'cyan');
  log('==========================================\n', 'cyan');
  
  const results = {
    total: 0,
    pdfs: 0,
    html: 0,
    pending: 0,
    duplicates: 0,
    errors: 0,
  };
  
  // PASSO 1: Processar documentos PENDING no banco
  results.pending = await processPendingDocuments();
  
  // PASSO 2: Processar URLs configuradas
  for (const url of URLS_TO_CRAWL) {
    try {
      results.total++;
      
      // Verificar se já existe
      if (await documentExists(url)) {
        results.duplicates++;
        continue;
      }
      
      if (url.endsWith('.pdf')) {
        // Processar PDF direto
        const pdfResult = await processPDF(url);
        if (pdfResult) {
          await saveDocument(url, pdfResult.title, pdfResult.text, 'PDF');
          results.pdfs++;
        } else {
          results.errors++;
        }
        
      } else {
        // Processar HTML + encontrar PDFs
        const htmlResult = await extractHTMLContent(url);
        
        if (htmlResult) {
          // Salvar conteúdo HTML
          if (htmlResult.text.length > 200) {
            await saveDocument(url, htmlResult.title, htmlResult.text, 'WEB');
            results.html++;
          }
          
          // Processar PDFs encontrados
          for (const pdfUrl of htmlResult.pdfLinks) {
            if (!URLS_TO_CRAWL.includes(pdfUrl) && !(await documentExists(pdfUrl))) {
              log(`\n📎 PDF encontrado no site: ${pdfUrl}`, 'yellow');
              
              const pdfResult = await processPDF(pdfUrl);
              if (pdfResult) {
                await saveDocument(pdfUrl, pdfResult.title, pdfResult.text, 'PDF');
                results.pdfs++;
              } else {
                results.errors++;
              }
            }
          }
        } else {
          results.errors++;
        }
      }
      
    } catch (error) {
      log(`\n❌ Erro ao processar ${url}:`, 'red');
      log(`   ${error}`, 'red');
      results.errors++;
    }
  }
  
  log('\n==========================================', 'cyan');
  log('✅ PROCESSAMENTO CONCLUÍDO!', 'green');
  log(`\n📊 Estatísticas:`, 'cyan');
  log(`   Total de URLs: ${results.total}`, 'blue');
  log(`   Docs PENDING processados: ${results.pending}`, 'green');
  log(`   PDFs indexados: ${results.pdfs}`, 'green');
  log(`   Páginas HTML: ${results.html}`, 'green');
  log(`   Duplicatas evitadas: ${results.duplicates}`, 'yellow');
  log(`   Erros: ${results.errors}`, 'red');
}

// Executar
main().catch(console.error);
