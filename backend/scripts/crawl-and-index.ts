/**
 * Script de Web Scraping e Indexação
 * 
 * Funcionalidades:
 * 1. Acessa sites governamentais
 * 2. Extrai conteúdo HTML (texto limpo)
 * 3. Encontra e baixa PDFs linkados
 * 4. Processa tudo com OCR se necessário
 * 5. Indexa na base vetorial
 * 
 * Uso:
 * npx tsx backend/scripts/crawl-and-index.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { createWorker } from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import TurndownService from 'turndown';
import { URL } from 'url';

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const turndownService = new TurndownService();

// Lista de URLs para processar
const URLS_TO_CRAWL = [
  // PDFs diretos (já testamos alguns)
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/01/LO-1081-2010.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2022/04/LO-2232-2022.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2024/12/LO-2667-2024.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/02/LO-97-1993.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2025/06/plano-municipal-de-educacao-saquarema.pdf',
  'https://www.saquarema.rj.gov.br/wp-content/uploads/2022/03/lista-de-ceps-saquarema.pdf',
  
  // Sites para extrair conteúdo
  'https://dos.saquarema.rj.gov.br/',
  'https://www.saquarema.rj.gov.br/legislacao/',
  'https://qedu.org.br/municipio/3305505-saquarema',
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
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
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
// PROCESSAMENTO DE PDF (com OCR)
// ==========================================

async function extractTextWithOCR(pdfBuffer: Buffer, docName: string): Promise<string> {
  log(`🔍 OCR detectado, processando: ${docName}`, 'yellow');
  
  try {
    // Converter Buffer para ArrayBuffer (correção TypeScript)
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );
    
    const pngPages = await pdfToPng(arrayBuffer, {
      viewportScale: 2.0,
      outputFolder: undefined,
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
      if (!pngPages[i].content) continue;
      const { data: { text } } = await worker.recognize(pngPages[i].content as Buffer);
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

async function processPDF(url: string): Promise<{ text: string; title: string }> {
  log(`\n📥 Baixando PDF: ${url}`, 'cyan');
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' },
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
}

// ==========================================
// PROCESSAMENTO DE HTML
// ==========================================

async function extractHTMLContent(url: string): Promise<{ text: string; title: string; pdfLinks: string[] }> {
  log(`\n🌐 Acessando site: ${url}`, 'cyan');
  
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000,
  });
  
  const $ = cheerio.load(response.data);
  
  // Extrair título
  const title = $('title').text() || $('h1').first().text() || url;
  
  // Remover scripts, styles, headers, footers, nav
  $('script, style, header, footer, nav, iframe, noscript').remove();
  
  // Extrair texto do main content
  const mainContent = $('main, article, .content, #content, .post').first();
  const bodyText = mainContent.length > 0 ? mainContent.text() : $('body').text();
  
  const text = cleanText(bodyText);
  
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
}

// ==========================================
// SALVAMENTO NO BANCO
// ==========================================

async function saveDocument(url: string, title: string, content: string, type: 'PDF' | 'WEB'): Promise<string | null> {
  try {
    // 1. Criar documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: title,
        type: type === 'PDF' ? 'LAW' : 'GUIDE',
        description: `Conteúdo extraído de: ${url}`,
        status: 'PENDING',
        source_url: url,
      })
      .select('id')
      .single();
    
    if (docError || !document) {
      log(`❌ Erro ao criar documento: ${docError?.message}`, 'red');
      return null;
    }
    
    // 2. Criar versão
    const contentHash = generateHash(content);
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        version_number: 1,
        content_hash: contentHash,
        file_size: content.length,
        status: 'PENDING',
        indexed: false,
      })
      .select('id')
      .single();
    
    if (versionError || !version) {
      log(`❌ Erro ao criar versão: ${versionError?.message}`, 'red');
      return null;
    }
    
    // 3. Criar chunks
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
      
      // 5. Salvar embedding
      const { error: embeddingError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding: embedding,
          model: 'text-embedding-3-large',
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
      .update({ indexed: true, status: 'ACTIVE' })
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
// FUNÇÃO PRINCIPAL
// ==========================================

async function main() {
  log('\n🚀 INICIANDO WEB SCRAPING E INDEXAÇÃO', 'cyan');
  log('==========================================\n', 'cyan');
  
  const results = {
    total: 0,
    pdfs: 0,
    html: 0,
    errors: 0,
  };
  
  for (const url of URLS_TO_CRAWL) {
    try {
      results.total++;
      
      if (url.endsWith('.pdf')) {
        // Processar PDF direto
        const { text, title } = await processPDF(url);
        await saveDocument(url, title, text, 'PDF');
        results.pdfs++;
        
      } else {
        // Processar HTML + encontrar PDFs
        const { text, title, pdfLinks } = await extractHTMLContent(url);
        
        // Salvar conteúdo HTML
        if (text.length > 200) {
          await saveDocument(url, title, text, 'WEB');
          results.html++;
        }
        
        // Processar PDFs encontrados
        for (const pdfUrl of pdfLinks) {
          if (!URLS_TO_CRAWL.includes(pdfUrl)) {
            log(`\n📎 PDF encontrado no site: ${pdfUrl}`, 'yellow');
            try {
              const { text: pdfText, title: pdfTitle } = await processPDF(pdfUrl);
              await saveDocument(pdfUrl, pdfTitle, pdfText, 'PDF');
              results.pdfs++;
            } catch (e) {
              log(`❌ Erro ao processar PDF linkado: ${e}`, 'red');
            }
          }
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
  log(`   PDFs processados: ${results.pdfs}`, 'green');
  log(`   Páginas HTML: ${results.html}`, 'green');
  log(`   Erros: ${results.errors}`, 'red');
}

// Executar
main().catch(console.error);
