/**
 * IMPROVED KNOWLEDGE BASE INDEXER V2
 * 
 * Melhorias implementadas:
 * ✅ Extração de datas dos documentos
 * ✅ Tipos de documento corrigidos (ENUM válido)
 * ✅ Detecção inteligente de tipo baseada em conteúdo
 * ✅ Melhor tratamento de duplicatas
 * ✅ Processamento de HTML + PDFs
 * ✅ Metadata enriquecida com datas
 * 
 * Uso:
 * npx tsx backend/scripts/improved-knowledge-indexer.ts
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

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Lista de URLs para crawling
const URLS_TO_CRAWL = [
  // Sites para scraping (processam HTML + PDFs dentro deles)
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
  
  // PDFs diretos
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/01/LO-1081-2010.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2022/04/LO-2232-2022.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2024/12/LO-2667-2024.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2018/02/LO-97-1993.pdf',
  'https://transparencia.saquarema.rj.gov.br/wp-content/uploads/2025/06/plano-municipal-de-educacao-saquarema.pdf',
  'https://www.saquarema.rj.gov.br/wp-content/uploads/2022/03/lista-de-ceps-saquarema.pdf',
];

// Tipos válidos do ENUM document_type
type DocumentType = 'NORM' | 'LAW' | 'RESOLUTION' | 'DIRECTIVE' | 'MANUAL' | 'REPORT' | 'OTHER';

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
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// ==========================================
// EXTRAÇÃO DE DATAS
// ==========================================

interface ExtractedDates {
  publicationDate?: string;
  effectiveDate?: string;
  expirationDate?: string;
  foundDates: string[];
}

function extractDates(text: string, filename?: string): ExtractedDates {
  const dates: string[] = [];
  
  // Padrões de data comuns
  const patterns = [
    // DD/MM/YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
    // DD de MMMM de YYYY
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/gi,
    // YYYY-MM-DD (ISO)
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  ];
  
  // Extrair datas do texto
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push(match[0]);
    }
  }
  
  // Extrair data do nome do arquivo (ex: LO-2232-2022.pdf)
  if (filename) {
    const yearMatch = filename.match(/[_\-](\d{4})[_\-\.]/);
    if (yearMatch) {
      dates.push(yearMatch[1]);
    }
  }
  
  // Procurar datas específicas no texto
  let publicationDate: string | undefined;
  let effectiveDate: string | undefined;
  
  const pubMatch = text.match(/publicad[oa]\s+em[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
  if (pubMatch) publicationDate = pubMatch[1];
  
  const effMatch = text.match(/entra\s+em\s+vigor\s+em[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
  if (effMatch) effectiveDate = effMatch[1];
  
  return {
    publicationDate,
    effectiveDate,
    foundDates: [...new Set(dates)], // Remove duplicatas
  };
}

// ==========================================
// DETECÇÃO INTELIGENTE DE TIPO
// ==========================================

function detectDocumentType(text: string, url: string, title: string): DocumentType {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  // LEI - Leis municipais, estaduais, federais
  if (
    /\blei\s+(n[°º]?\.?\s*)?\d+/i.test(text) ||
    /lei\s+orgânica/i.test(text) ||
    /lei\s+complementar/i.test(text) ||
    /lei\s+ordinária/i.test(text) ||
    lowerUrl.includes('/lei') ||
    lowerTitle.includes('lei')
  ) {
    return 'LAW';
  }
  
  // RESOLUTION - Resoluções
  if (
    /\bresolução\s+(n[°º]?\.?\s*)?\d+/i.test(text) ||
    lowerTitle.includes('resolução')
  ) {
    return 'RESOLUTION';
  }
  
  // DIRECTIVE - Portarias, Decretos, Diretrizes
  if (
    /\bportaria\s+(n[°º]?\.?\s*)?\d+/i.test(text) ||
    /\bdecreto\s+(n[°º]?\.?\s*)?\d+/i.test(text) ||
    /\bdiretriz/i.test(text) ||
    lowerTitle.includes('portaria') ||
    lowerTitle.includes('decreto')
  ) {
    return 'DIRECTIVE';
  }
  
  // REPORT - Relatórios, Planos, Estudos
  if (
    /\brelatório/i.test(text) ||
    /\bplano\s+municipal/i.test(text) ||
    /\bplano\s+plurianual/i.test(text) ||
    /\bestudo/i.test(text) ||
    lowerTitle.includes('relatório') ||
    lowerTitle.includes('plano') ||
    lowerUrl.includes('plano')
  ) {
    return 'REPORT';
  }
  
  // MANUAL - Manuais, Guias, Procedimentos
  if (
    /\bmanual/i.test(text) ||
    /\bguia/i.test(text) ||
    /\bprocedimento/i.test(text) ||
    lowerTitle.includes('manual') ||
    lowerTitle.includes('guia')
  ) {
    return 'MANUAL';
  }
  
  // NORM - Normas, Regulamentos
  if (
    /\bnorma/i.test(text) ||
    /\bregulamento/i.test(text) ||
    /\bregimento/i.test(text) ||
    lowerTitle.includes('norma') ||
    lowerTitle.includes('regimento')
  ) {
    return 'NORM';
  }
  
  // Default
  return 'OTHER';
}

// ==========================================
// VERIFICAÇÃO DE DUPLICATAS
// ==========================================

async function documentExists(url: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('file_url', url)
    .limit(1)
    .single();
  
  return !!data && !error;
}

// ==========================================
// PROCESSAMENTO DE PDF
// ==========================================

async function processPDF(url: string): Promise<{ text: string; title: string; needsOCR: boolean } | null> {
  try {
    log(`📄 Baixando PDF: ${url}`, 'cyan');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    // Tentar extrair texto nativo
    const pdfData = await pdfParse(buffer);
    const extractedText = cleanText(pdfData.text);
    
    // Se tem texto suficiente, não precisa de OCR
    if (extractedText.length > 100) {
      log(`✅ PDF com texto nativo: ${extractedText.length} chars`, 'green');
      const title = url.split('/').pop()?.replace('.pdf', '') || 'Documento PDF';
      return { text: extractedText, title, needsOCR: false };
    }
    
    // Caso contrário, fazer OCR
    log(`🔍 PDF escaneado detectado, iniciando OCR...`, 'yellow');
    const pngPages = await pdfToPng(buffer.buffer as ArrayBuffer, { outputFolder: '/tmp' });
    
    const worker = await createWorker('por');
    let ocrText = '';
    
    for (let i = 0; i < Math.min(pngPages.length, 50); i++) {
      const { data } = await worker.recognize(pngPages[i].path);
      ocrText += data.text + '\n';
      process.stdout.write(`\r🔍 OCR progresso: ${i + 1}/${pngPages.length} páginas`);
    }
    console.log();
    
    await worker.terminate();
    
    const cleanedOCR = cleanText(ocrText);
    log(`✅ OCR concluído: ${cleanedOCR.length} chars`, 'green');
    
    const title = url.split('/').pop()?.replace('.pdf', '') || 'Documento PDF';
    return { text: cleanedOCR, title, needsOCR: true };
    
  } catch (error: any) {
    log(`❌ Erro ao processar PDF: ${error.message}`, 'red');
    return null;
  }
}

// ==========================================
// PROCESSAMENTO DE HTML (WEB SCRAPING)
// ==========================================

async function scrapeWebsite(url: string): Promise<{ text: string; title: string; pdfLinks: string[] } | null> {
  try {
    log(`🌐 Acessando site: ${url}`, 'cyan');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });
    
    const $ = cheerio.load(response.data);
    
    // Remover scripts, styles, etc
    $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();
    
    // Extrair título
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Página Web';
    
    // Extrair texto principal
    const text = cleanText($('body').text());
    
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

async function saveDocument(
  url: string, 
  title: string, 
  content: string, 
  sourceType: 'PDF' | 'WEB',
  metadata?: any
): Promise<string | null> {
  try {
    // Verificar duplicata
    if (await documentExists(url)) {
      log(`⏭️  Documento já existe: ${title}`, 'yellow');
      return null;
    }
    
    // Extrair datas do conteúdo
    const filename = url.split('/').pop();
    const dates = extractDates(content, filename);
    
    // Detectar tipo de documento
    const documentType = detectDocumentType(content, url, title);
    
    // Enriquecer metadata
    const enrichedMetadata = {
      source_url: url,
      source_type: sourceType,
      crawled_at: new Date().toISOString(),
      document_type_detected: documentType,
      dates_found: dates.foundDates,
      publication_date: dates.publicationDate,
      effective_date: dates.effectiveDate,
      ...metadata,
    };
    
    log(`📝 Tipo detectado: ${documentType}`, 'blue');
    if (dates.foundDates.length > 0) {
      log(`📅 Datas encontradas: ${dates.foundDates.slice(0, 3).join(', ')}`, 'blue');
    }
    
    // 1. Criar documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: title,
        description: `${sourceType === 'PDF' ? 'PDF' : 'Página web'} extraído de: ${url}`,
        document_type: documentType,
        file_url: url,
        status: 'PENDING',
        metadata: enrichedMetadata,
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
        extraction_method: sourceType === 'PDF' ? 'PDF_PARSE' : 'HTML_SCRAPING',
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
            document_type: documentType,
            source_url: url,
            publication_date: dates.publicationDate,
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
    
    log(`✅ Documento salvo: ${title} (${chunks.length} chunks, tipo: ${documentType})`, 'green');
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
  log('\n🚀 INICIANDO INDEXAÇÃO DA BASE DE CONHECIMENTO V2', 'magenta');
  log('='.repeat(60), 'magenta');
  
  let totalProcessed = 0;
  let totalErrors = 0;
  const processedPDFs = new Set<string>();
  
  for (const url of URLS_TO_CRAWL) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`🔗 Processando URL: ${url}`, 'cyan');
    log('='.repeat(60), 'cyan');
    
    try {
      // Verificar se é PDF ou site
      if (url.toLowerCase().endsWith('.pdf')) {
        // Processar PDF diretamente
        const pdfResult = await processPDF(url);
        if (pdfResult) {
          await saveDocument(url, pdfResult.title, pdfResult.text, 'PDF', {
            needs_ocr: pdfResult.needsOCR,
          });
          totalProcessed++;
          processedPDFs.add(url);
        } else {
          totalErrors++;
        }
      } else {
        // Fazer web scraping
        const webResult = await scrapeWebsite(url);
        if (webResult) {
          // Salvar conteúdo HTML
          if (webResult.text.length > 200) {
            await saveDocument(url, webResult.title, webResult.text, 'WEB');
            totalProcessed++;
          }
          
          // Processar PDFs encontrados no site
          log(`\n📚 Processando ${webResult.pdfLinks.length} PDFs encontrados no site...`, 'blue');
          for (const pdfUrl of webResult.pdfLinks) {
            // Evitar processar o mesmo PDF duas vezes
            if (processedPDFs.has(pdfUrl)) {
              log(`⏭️  PDF já processado: ${pdfUrl}`, 'yellow');
              continue;
            }
            
            const pdfResult = await processPDF(pdfUrl);
            if (pdfResult) {
              await saveDocument(pdfUrl, pdfResult.title, pdfResult.text, 'PDF', {
                needs_ocr: pdfResult.needsOCR,
                found_in: url,
              });
              totalProcessed++;
              processedPDFs.add(pdfUrl);
            } else {
              totalErrors++;
            }
            
            // Pequeno delay para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          totalErrors++;
        }
      }
      
      // Delay entre URLs para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log(`❌ Erro ao processar ${url}: ${error}`, 'red');
      totalErrors++;
    }
  }
  
  // Resumo final
  log('\n' + '='.repeat(60), 'magenta');
  log('📊 RESUMO DA INDEXAÇÃO', 'magenta');
  log('='.repeat(60), 'magenta');
  log(`✅ Documentos processados: ${totalProcessed}`, 'green');
  log(`❌ Erros encontrados: ${totalErrors}`, 'red');
  log(`📄 PDFs únicos processados: ${processedPDFs.size}`, 'blue');
  log('\n✅ Indexação concluída!', 'green');
}

// Executar
main().catch(console.error);
