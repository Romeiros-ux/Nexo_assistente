/**
 * Script para forçar processamento direto de documentos PENDING
 * 
 * Este script:
 * 1. Baixa os PDFs do Supabase Storage
 * 2. Extrai o texto com pdf-parse
 * 3. Gera chunks
 * 4. Cria embeddings com OpenAI
 * 5. Salva chunks e embeddings no banco
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import  OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { createWorker } from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';

interface ChunkWithEmbedding {
  content: string;
  chunk_index: number;
  embedding: number[];
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error(`${colors.red}❌ Variáveis de ambiente faltando!${colors.reset}`);
  console.log('Necessárias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface Document {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
}

async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Forçar Processamento de Documentos   ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  // 1. Buscar documentos PENDING
  console.log(`${colors.blue}📄 Buscando documentos PENDING...${colors.reset}`);
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, name, file_url, document_type')
    .eq('status', 'PENDING');

  if (error) {
    console.error(`${colors.red}❌ Erro ao buscar documentos: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log(`${colors.yellow}⚠️  Nenhum documento PENDING encontrado${colors.reset}`);
    return;
  }

  console.log(`${colors.green}✅ ${documents.length} documentos encontrados${colors.reset}\n`);

  // 2. Processar cada documento
  for (const doc of documents) {
    await processDocument(doc);
  }

  console.log(`\n${colors.green}🎉 Processamento concluído!${colors.reset}`);
}

async function processDocument(doc: Document) {
  console.log(`${colors.blue}📄 Processando: ${doc.name}${colors.reset}`);

  try {
    // 1. Criar document_version (ou buscar existente)
    console.log(`  ${colors.yellow}📋 Criando versão...${colors.reset}`);
    const { data: existingVersion } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .eq('status', 'COMPLETED')
      .single();

    let versionId: string;

    if (existingVersion) {
      versionId = existingVersion.id;
      console.log(`  ${colors.cyan}ℹ️  Versão existente encontrada${colors.reset}`);

      // Verificar se já existem chunks para essa versão
      const { data: existingChunks, error: chunksCheckError } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', versionId)
        .limit(1);

      if (chunksCheckError) {
        throw new Error(`Erro ao verificar chunks: ${chunksCheckError.message}`);
      }

      if (existingChunks && existingChunks.length > 0) {
        console.log(`  ${colors.yellow}⚠️  Documento já processado (chunks existentes)${colors.reset}`);
        console.log(`  ${colors.cyan}ℹ️  Pulando processamento${colors.reset}\n`);
        return;
      }
    } else {
      const { data: newVersion, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: doc.id,
          version_number: 1,
          status: 'COMPLETED',
        })
        .select('id')
        .single();

      if (versionError || !newVersion) {
        throw new Error(`Erro ao criar versão: ${versionError?.message}`);
      }

      versionId = newVersion.id;
      console.log(`  ${colors.green}✅ Versão criada${colors.reset}`);
    }

    // 2. Baixar PDF do Storage
    console.log(`  ${colors.yellow}⬇️  Baixando PDF...${colors.reset}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('institutional-documents')
      .download(doc.file_url);

    if (downloadError || !fileData) {
      throw new Error(`Erro ao baixar: ${downloadError?.message}`);
    }

    // 2. Extrair texto do PDF
    console.log(`  ${colors.yellow}📝 Extraindo texto...${colors.reset}`);
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    let fullText = pdfData.text;

    // Se texto muito curto, tentar OCR
    if (!fullText || fullText.trim().length < 100) {
      console.log(`  ${colors.yellow}⚠️  Texto curto (${fullText?.length || 0} chars), tentando OCR...${colors.reset}`);
      fullText = await extractTextWithOCR(buffer, doc.name);
      
      if (!fullText || fullText.trim().length < 100) {
        throw new Error('OCR falhou: texto ainda muito curto ou vazio');
      }
    }

    console.log(`  ${colors.green}✅ ${fullText.length} caracteres extraídos${colors.reset}`);

    // 3. Gerar chunks (1000 caracteres cada)
    console.log(`  ${colors.yellow}✂️  Gerando chunks...${colors.reset}`);
    const chunks = splitIntoChunks(fullText, 1000);
    console.log(`  ${colors.green}✅ ${chunks.length} chunks gerados${colors.reset}`);

    // 4. Gerar embeddings para cada chunk
    console.log(`  ${colors.yellow}🧠 Gerando embeddings...${colors.reset}`);
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Gerar embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk,
        dimensions: 1536, // Forçar 1536 dimensões (compatível com pgvector)
      });

      const embedding = response.data[0].embedding;

      chunksWithEmbeddings.push({
        content: chunk,
        chunk_index: i,
        embedding,
      });

      // Log de progresso
      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`  ${colors.cyan}   ${i + 1}/${chunks.length} embeddings gerados${colors.reset}`);
      }
    }

    console.log(`  ${colors.green}✅ Embeddings gerados${colors.reset}`);

    // 5. Salvar chunks no banco (tabela document_chunks)
    console.log(`  ${colors.yellow}💾 Salvando chunks...${colors.reset}`);
    
    const chunkRecords = chunksWithEmbeddings.map(item => ({
      id: crypto.randomUUID(),
      document_version_id: versionId, // Usando ID da versão criada
      content: item.content,
      chunk_index: item.chunk_index,
      metadata: {
        document_name: doc.name,
        document_type: doc.document_type,
      },
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
      .select('id, chunk_index');

    if (chunksError) {
      console.error(`${colors.red}    ❌ Erro ao salvar chunks: ${chunksError.message}${colors.reset}`);
      throw chunksError;
    }

    console.log(`  ${colors.green}✅ ${insertedChunks?.length || 0} chunks salvos${colors.reset}`);

    // 6. Salvar embeddings no banco (tabela document_embeddings)
    console.log(`  ${colors.yellow}💾 Salvando embeddings...${colors.reset}`);

    const embeddingRecords = insertedChunks!.map((chunk, index) => ({
      id: crypto.randomUUID(),
      document_chunk_id: chunk.id,
      embedding: chunksWithEmbeddings[index].embedding,
      model: 'text-embedding-3-large',
      model_version: 'v1',
      tokens_used: Math.ceil(chunksWithEmbeddings[index].content.length / 4), // ~4 chars per token
    }));

    const { error: embeddingsError } = await supabase
      .from('document_embeddings')
      .insert(embeddingRecords);

    if (embeddingsError) {
      console.error(`${colors.red}    ❌ Erro ao salvar embeddings: ${embeddingsError.message}${colors.reset}`);
      throw embeddingsError;
    }

    console.log(`  ${colors.green}✅ ${embeddingRecords.length} embeddings salvos${colors.reset}`);

    console.log(`  ${colors.green}✅ ${embeddingRecords.length} embeddings salvos${colors.reset}`);

    // 7. Atualizar status do documento para ACTIVE
    await supabase
      .from('documents')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', doc.id);

    console.log(`  ${colors.green}✅ ${doc.name} processado com sucesso!${colors.reset}\n`);

  } catch (error: any) {
    console.error(`  ${colors.red}❌ Erro: ${error.message}${colors.reset}\n`);
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    // Se não chegou no final, tenta quebrar em ponto final
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex);
      if (lastPeriod > startIndex && lastPeriod < endIndex) {
        endIndex = lastPeriod + 1;
      }
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    startIndex = endIndex;
  }

  return chunks;
}

/**
 * Processa PDF escaneado usando OCR (Tesseract.js)
 */
async function extractTextWithOCR(pdfBuffer: Buffer, docName: string): Promise<string> {
  console.log(`  ${colors.yellow}🔍 Iniciando OCR (pode levar 5-10 min)...${colors.reset}`);
  
  try {
    // Converter Buffer para ArrayBuffer (correção TypeScript)
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );
    
    // Converter PDF para imagens PNG
    const pngPages = await pdfToPng(arrayBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 2.0, // Maior resolução = melhor OCR
    });

    console.log(`  ${colors.cyan}ℹ️  ${pngPages.length} páginas detectadas${colors.reset}`);

    // Criar worker do Tesseract (português)
    const worker = await createWorker('por', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const percent = Math.round(m.progress * 100);
          if (percent % 10 === 0) {
            console.log(`  ${colors.cyan}   OCR: ${percent}% concluído${colors.reset}`);
          }
        }
      },
    });

    let fullText = '';

    // Processar cada página
    for (let i = 0; i < pngPages.length; i++) {
      const page = pngPages[i];
      console.log(`  ${colors.yellow}📄 Processando página ${i + 1}/${pngPages.length}...${colors.reset}`);
      
      // Verificar se content existe (correção TypeScript)
      if (!page.content) {
        console.log(`  ${colors.yellow}⚠️ Página ${i + 1} sem conteúdo, pulando...${colors.reset}`);
        continue;
      }
      
      const { data: { text } } = await worker.recognize(page.content);
      fullText += text + '\n\n';
      
      console.log(`  ${colors.green}✅ Página ${i + 1} processada (${text.length} chars)${colors.reset}`);
    }

    await worker.terminate();

    console.log(`  ${colors.green}✅ OCR concluído: ${fullText.length} caracteres extraídos${colors.reset}`);
    return fullText;

  } catch (error) {
    console.error(`  ${colors.red}❌ Erro no OCR:${colors.reset}`, error);
    throw new Error(`Falha no OCR: ${error}`);
  }
}

main();
