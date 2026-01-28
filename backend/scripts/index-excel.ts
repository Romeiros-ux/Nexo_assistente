/**
 * EXCEL INDEXER - Processar arquivos Excel da pasta downloads
 * 
 * Processa arquivos .xlsx e .xlsm convertendo para texto estruturado
 * e indexando no banco de dados
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Converter Excel para texto estruturado
function excelToText(filePath: string): string {
  const workbook = XLSX.readFile(filePath);
  const allText: string[] = [];

  workbook.SheetNames.forEach(sheetName => {
    allText.push(`\n=== ${sheetName} ===\n`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para CSV (mais legível que JSON)
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    // Processar cada linha para melhor formatação
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      // Primeira linha como cabeçalho
      const headers = lines[0].split(',');
      allText.push(`Colunas: ${headers.join(' | ')}\n`);
      
      // Dados
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: string[] = [];
        
        headers.forEach((header, idx) => {
          if (values[idx]?.trim()) {
            row.push(`${header}: ${values[idx]}`);
          }
        });
        
        if (row.length > 0) {
          allText.push(row.join(' | '));
        }
      }
    }
  });

  return allText.join('\n');
}

// Criar chunks do texto
function createChunks(text: string, fileName: string): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1500;
  
  const lines = text.split('\n');
  let currentChunk = `Arquivo: ${fileName}\n\n`;

  for (const line of lines) {
    if ((currentChunk + line).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = `Arquivo: ${fileName}\n\n${line}\n`;
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
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

// Processar um arquivo Excel
async function processExcelFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  
  log(`\n📊 Processando: ${fileName}`, 'cyan');

  // 1. Verificar se já foi processado
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('name', fileName)
    .single();

  if (existing) {
    log(`  ⏭️  Já processado`, 'yellow');
    return;
  }

  // 2. Extrair texto do Excel
  const text = excelToText(filePath);
  
  if (!text || text.length < 50) {
    log(`  ❌ Arquivo vazio ou sem dados`, 'red');
    return;
  }

  log(`  ✅ ${text.length} caracteres extraídos`, 'green');

  // 3. Determinar tipo de documento pelo nome
  let documentType = 'REPORT';
  let metadata: any = {
    source: 'QEdu',
    formato: 'Excel',
  };

  if (fileName.includes('ideb')) {
    metadata.categoria = 'IDEB';
  } else if (fileName.includes('taxa_rendimento')) {
    metadata.categoria = 'Taxa de Rendimento';
  } else if (fileName.includes('distorcao')) {
    metadata.categoria = 'Distorção Idade-Série';
  } else if (fileName.includes('saeb')) {
    metadata.categoria = 'SAEB - Aprendizado';
  } else if (fileName.includes('permanencias')) {
    metadata.categoria = 'Taxa de Permanência';
  }

  // Detectar etapa de ensino
  if (fileName.includes('-AI')) {
    metadata.etapa = 'Anos Iniciais';
  } else if (fileName.includes('-AF')) {
    metadata.etapa = 'Anos Finais';
  } else if (fileName.includes('-EM')) {
    metadata.etapa = 'Ensino Médio';
  }

  // Detectar ano
  const yearMatch = fileName.match(/(\d{4})/);
  if (yearMatch) {
    metadata.ano = yearMatch[1];
  }

  // 4. Criar documento no banco
  console.log('  📝 Tentando criar documento...');
  console.log('  📋 Dados:', {
    name: fileName,
    document_type: documentType,
    file_url: `file:///${filePath}`,
    status: 'ACTIVE',
  });

  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      name: fileName,
      document_type: documentType,
      file_url: `file:///${filePath}`,
      status: 'ACTIVE',
    })
    .select()
    .single();

  console.log('  ��� Resultado:', { document, docError });

  if (docError) {
    log(`  ❌ Erro ao criar documento: ${docError.message}`, 'red');
    console.error('  📋 Detalhes completos do erro:', JSON.stringify(docError, null, 2));
    return;
  }

  if (!document) {
    log(`  ❌ Documento retornou null (sem erro)`, 'red');
    return;
  }

  log(`  ✅ Documento criado: ${document.id}`, 'green');

  // 5. Criar versão
  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: document.id,
      status: 'PROCESSING'
    })
    .select()
    .single();

  if (versionError || !version) {
    log(`  ❌ Erro ao criar versão: ${versionError?.message || 'null'}`, 'red');
    return;
  }

  // 6. Criar chunks
  const chunks = createChunks(text, fileName);
  log(`  📦 ${chunks.length} chunks criados`, 'blue');

  // 7. Processar cada chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];

    // Criar chunk
    const { data: chunk, error: chunkError } = await supabase
      .from('document_chunks')
      .insert({
        document_version_id: version.id,
        content: chunkContent,
        chunk_index: i,
        metadata: {
          tipo: 'excel',
          ...metadata,
        },
      })
      .select()
      .single();

    if (chunkError || !chunk) {
      log(`\n  ❌ Erro ao criar chunk ${i}: ${chunkError?.message || 'null'}`, 'red');
      continue;
    }

    // Gerar embedding
    const embedding = await generateEmbedding(chunkContent);

    const { error: embError } = await supabase
      .from('document_embeddings')
      .insert({
        chunk_id: chunk.id,
        embedding,
        model: 'text-embedding-3-large',
      });

    if (embError) {
      log(`\n  ❌ Erro ao salvar embedding ${i}: ${embError.message}`, 'red');
      continue;
    }

    process.stdout.write(`\r  ✅ Progresso: ${i + 1}/${chunks.length} chunks processados`);
  }

  // 8. Marcar como indexado
  await supabase
    .from('document_versions')
    .update({ indexed: true })
    .eq('id', version.id);

  log(`\n  ✅ Documento indexado com sucesso!`, 'green');
}

// Main
async function main() {
  log('\n🚀 EXCEL INDEXER - DADOS EDUCACIONAIS', 'green');
  log('==========================================\n', 'green');

  // Listar arquivos Excel
  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xlsm'))
    .map(f => path.join(DOWNLOADS_DIR, f));

  log(`📚 Encontrados ${files.length} arquivos Excel\n`, 'cyan');

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      await processExcelFile(file);
      processed++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    } catch (error: any) {
      log(`  ❌ Erro: ${error.message}`, 'red');
      errors++;
    }
  }

  log('\n==========================================', 'green');
  log('✅ PROCESSAMENTO CONCLUÍDO!', 'green');
  log(`\n📊 Estatísticas:`, 'cyan');
  log(`   Total de arquivos: ${files.length}`, 'cyan');
  log(`   Processados: ${processed}`, 'green');
  log(`   Já existiam: ${skipped}`, 'yellow');
  log(`   Erros: ${errors}\n`, errors > 0 ? 'red' : 'cyan');
}

main().catch(console.error);
