/**
 * IMPROVED EXCEL INDEXER - Processar arquivos Excel com contexto enriquecido
 * 
 * Melhorias:
 * 1. Adiciona nome do município (Saquarema) em cada chunk
 * 2. Adiciona ano e etapa extraídos do nome do arquivo
 * 3. Traduz códigos para textos legíveis
 * 4. Adiciona contexto semântico para melhor busca vetorial
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

// Mapeamento de códigos para descrições
const DEPENDENCIAS: Record<string, string> = {
  '0': 'Total',
  '1': 'Federal',
  '2': 'Estadual',
  '3': 'Municipal',
  '4': 'Privada',
  '5': 'Pública',
};

const LOCALIZACOES: Record<string, string> = {
  '0': 'Total',
  '1': 'Urbana',
  '2': 'Rural',
};

const SERIES: Record<string, string> = {
  '1': '1º ano EF',
  '2': '2º ano EF',
  '3': '3º ano EF',
  '4': '4º ano EF',
  '5': '5º ano EF',
  '6': '6º ano EF',
  '7': '7º ano EF',
  '8': '8º ano EF',
  '9': '9º ano EF',
  '10': '1º ano EM',
  '11': '2º ano EM',
  '12': '3º ano EM',
  '14': 'Anos Iniciais (1º-5º)',
  '15': 'Anos Finais (6º-9º)',
  '16': 'Ensino Médio',
};

const ETAPAS: Record<string, string> = {
  'AI': 'Anos Iniciais (1º ao 5º ano)',
  'AF': 'Anos Finais (6º ao 9º ano)',
  'EM': 'Ensino Médio',
};

// Extrair metadados do nome do arquivo
interface FileMetadata {
  tipoIndicador: string;
  municipio: string;
  codigoIbge: string;
  ano: string;
  etapa: string;
  etapaDescricao: string;
}

function extractMetadata(fileName: string): FileMetadata {
  // Exemplo: taxa_rendimento_territorios-3305505-2023-AF.xlsx
  const parts = fileName.replace('.xlsx', '').replace('.xlsm', '').split('-');
  
  const tipoIndicador = parts[0].replace(/_/g, ' ').replace('territorios', '').trim();
  const codigoIbge = parts[1] || '3305505';
  const ano = parts[2] || '2023';
  const etapa = parts[3] || 'AF';

  return {
    tipoIndicador: tipoIndicador === 'taxa rendimento' ? 'Taxa de Rendimento Escolar' :
                   tipoIndicador === 'ideb' ? 'IDEB - Índice de Desenvolvimento da Educação Básica' :
                   tipoIndicador === 'distorcao idade serie' ? 'Distorção Idade-Série' :
                   tipoIndicador === 'saeb aprendizado' ? 'SAEB - Aprendizado' :
                   tipoIndicador === 'permanencias' ? 'Taxa de Permanência' :
                   tipoIndicador,
    municipio: 'Saquarema-RJ',
    codigoIbge,
    ano,
    etapa,
    etapaDescricao: ETAPAS[etapa] || etapa,
  };
}

// Converter Excel para texto estruturado com contexto
function excelToText(filePath: string): string {
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(fileName);
  
  const workbook = XLSX.readFile(filePath);
  const allText: string[] = [];

  // Cabeçalho com contexto
  allText.push(`DOCUMENTO: ${metadata.tipoIndicador}`);
  allText.push(`MUNICÍPIO: ${metadata.municipio} (Código IBGE: ${metadata.codigoIbge})`);
  allText.push(`ANO: ${metadata.ano}`);
  allText.push(`ETAPA: ${metadata.etapaDescricao}`);
  allText.push('');

  workbook.SheetNames.forEach(sheetName => {
    // Pular a sheet "Dicionário" - não precisa indexar metadados
    if (sheetName.toLowerCase().includes('dicion')) {
      return;
    }

    allText.push(`\n=== ${sheetName} ===\n`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para CSV
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      const headers = lines[0].split(',');
      allText.push(`Colunas: ${headers.join(' | ')}\n`);
      
      // Processar dados
      for (let i = 1; i < lines.length && i < 1000; i++) { // Limitar a 1000 linhas para não ficar muito grande
        const values = lines[i].split(',');
        const row: string[] = [];
        
        // Adicionar contexto em cada linha
        row.push(`Município: ${metadata.municipio}`);
        row.push(`Ano: ${metadata.ano}`);
        
        headers.forEach((header, idx) => {
          if (values[idx]?.trim()) {
            let value = values[idx];
            
            // Traduzir códigos conhecidos
            if (header === 'dependencia_id') {
              value = `${DEPENDENCIAS[value] || value} (${value})`;
            } else if (header === 'localizacao_id') {
              value = `${LOCALIZACOES[value] || value} (${value})`;
            } else if (header === 'serie_id') {
              value = `${SERIES[value] || value} (${value})`;
            } else if (header === 'aprovados' || header === 'reprovados' || header === 'abandonos') {
              // Formatar percentuais
              value = `${value}%`;
            }
            
            row.push(`${header}: ${value}`);
          }
        });
        
        if (row.length > 2) { // Pelo menos município e ano + 1 dado
          allText.push(row.join(' | '));
        }
      }
    }
  });

  return allText.join('\n');
}

// Criar chunks do texto
function createChunks(text: string, metadata: FileMetadata): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1500;
  
  const lines = text.split('\n');
  
  // Cabeçalho com contexto para cada chunk
  const chunkHeader = `${metadata.tipoIndicador} - ${metadata.municipio} - ${metadata.ano}
Etapa: ${metadata.etapaDescricao}

`;

  let currentChunk = chunkHeader;

  for (const line of lines) {
    // Pular linhas do cabeçalho principal (já estão no chunkHeader)
    if (line.startsWith('DOCUMENTO:') || line.startsWith('MUNICÍPIO:') || 
        line.startsWith('ANO:') || line.startsWith('ETAPA:')) {
      continue;
    }

    if ((currentChunk + line).length > maxChunkSize) {
      if (currentChunk.trim().length > chunkHeader.length) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = chunkHeader + line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk.trim().length > chunkHeader.length) {
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

// Deletar documento existente (para reindexação)
async function deleteExistingDocument(fileName: string): Promise<void> {
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('name', fileName);

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      // Deletar versões (cascade vai deletar chunks e embeddings)
      await supabase
        .from('document_versions')
        .delete()
        .eq('document_id', doc.id);

      // Deletar documento
      await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
    }
    log(`🗑️  Documento existente deletado: ${fileName}`, 'yellow');
  }
}

// Processar um arquivo Excel
async function processExcelFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(fileName);
  
  log(`\n📄 Processando: ${fileName}`, 'cyan');
  log(`   Tipo: ${metadata.tipoIndicador}`, 'blue');
  log(`   Município: ${metadata.municipio}`, 'blue');
  log(`   Ano: ${metadata.ano} | Etapa: ${metadata.etapaDescricao}`, 'blue');

  try {
    // 1. Deletar documento existente se houver
    await deleteExistingDocument(fileName);

    // 2. Extrair texto do Excel
    log('📖 Extraindo texto...', 'yellow');
    const fullText = excelToText(filePath);
    log(`   Texto extraído: ${fullText.length.toLocaleString()} caracteres`, 'blue');

    // 3. Criar chunks
    const chunks = createChunks(fullText, metadata);
    log(`   Chunks criados: ${chunks.length}`, 'blue');

    // 4. Criar documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: fileName,
        document_type: 'REPORT',
        file_url: `file:///${filePath}`,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (docError) throw docError;

    // 5. Criar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        status: 'PROCESSING',
        extracted_text_length: fullText.length,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 6. Processar chunks
    log('🔄 Indexando chunks...', 'yellow');
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
            municipio: metadata.municipio,
            ano: metadata.ano,
            etapa: metadata.etapa,
          },
        })
        .select()
        .single();

      if (chunkError) throw chunkError;

      // Gerar embedding
      const embedding = await generateEmbedding(chunkContent);

      // Salvar embedding
      const { error: embError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
          model_version: '1',
          tokens_used: Math.ceil(chunkContent.length / 4),
        });

      if (embError) throw embError;

      // Log de progresso
      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        log(`   Progresso: ${i + 1}/${chunks.length} chunks`, 'blue');
      }
    }

    // 7. Atualizar status da versão
    await supabase
      .from('document_versions')
      .update({
        status: 'COMPLETED',
        indexed: true,
      })
      .eq('id', version.id);

    log('✅ Documento indexado com sucesso!', 'green');
    
  } catch (error: any) {
    log(`❌ Erro ao processar ${fileName}: ${error.message}`, 'red');
    throw error;
  }
}

// Main
async function main() {
  log('\n🚀 INICIANDO INDEXAÇÃO MELHORADA DE ARQUIVOS EXCEL\n', 'cyan');
  
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    log('❌ Diretório downloads não encontrado!', 'red');
    return;
  }

  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xlsm'))
    .map(f => path.join(DOWNLOADS_DIR, f));

  log(`📊 Encontrados ${files.length} arquivos Excel\n`, 'green');

  for (const file of files) {
    await processExcelFile(file);
  }

  log('\n✅ INDEXAÇÃO CONCLUÍDA!', 'green');
}

main().catch(console.error);
