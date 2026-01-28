/**
 * REINDEX IDEB 2023 - Versão Estruturada
 * 
 * Melhoria de conteúdo dos chunks IDEB para melhor interpretação pela LLM:
 * 1. Ignora sheet "Dicionário" (apenas metadados)
 * 2. Foca na sheet de dados reais
 * 3. Adiciona contexto completo em cada chunk
 * 4. Preserva estrutura tabular legível
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

const ETAPAS: Record<string, string> = {
  'AI': 'Anos Iniciais (1º ao 5º ano do Ensino Fundamental)',
  'AF': 'Anos Finais (6º ao 9º ano do Ensino Fundamental)',
  'EM': 'Ensino Médio',
};

interface FileMetadata {
  tipo: string;
  municipio: string;
  codigoIbge: string;
  ano: string;
  etapa: string;
  etapaDescricao: string;
}

function extractMetadata(fileName: string): FileMetadata {
  const parts = fileName.replace('.xlsx', '').split('-');
  const etapa = parts[3] || 'AF';

  return {
    tipo: 'IDEB - Índice de Desenvolvimento da Educação Básica',
    municipio: 'Saquarema-RJ',
    codigoIbge: parts[1] || '3305505',
    ano: parts[2] || '2023',
    etapa,
    etapaDescricao: ETAPAS[etapa] || etapa,
  };
}

// Converter Excel para texto estruturado e legível
function excelToStructuredText(filePath: string, metadata: FileMetadata): string {
  const workbook = XLSX.readFile(filePath);
  const allText: string[] = [];

  // Cabeçalho com contexto completo
  allText.push('═══════════════════════════════════════════════════════════');
  allText.push(`INDICADOR EDUCACIONAL: ${metadata.tipo}`);
  allText.push(`MUNICÍPIO: ${metadata.municipio} (Código IBGE: ${metadata.codigoIbge})`);
  allText.push(`ANO DE REFERÊNCIA: ${metadata.ano}`);
  allText.push(`ETAPA DE ENSINO: ${metadata.etapaDescricao}`);
  allText.push('═══════════════════════════════════════════════════════════');
  allText.push('');

  // Processar apenas sheets com dados (ignorar "Dicionário")
  workbook.SheetNames.forEach(sheetName => {
    // Pular sheet de dicionário - não tem dados, só metadados
    if (sheetName.toLowerCase().includes('dicion') || 
        sheetName.toLowerCase().includes('metadata')) {
      log(`   ⏭️  Pulando sheet: ${sheetName} (metadados)`, 'yellow');
      return;
    }

    log(`   📊 Processando sheet: ${sheetName}`, 'blue');
    allText.push(`\n━━━ DADOS: ${sheetName} ━━━\n`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (jsonData.length === 0) {
      allText.push('(Sem dados nesta sheet)\n');
      return;
    }

    // Adicionar descrição do que são os dados
    allText.push(`Este dataset contém indicadores do IDEB ${metadata.ano} para ${metadata.etapaDescricao} em ${metadata.municipio}.\n`);

    // Processar cada linha de dados
    jsonData.forEach((row: any, index) => {
      if (index >= 100) return; // Limitar a 100 registros por sheet

      const entries = Object.entries(row);
      if (entries.length === 0) return;

      allText.push(`\n【 Registro ${index + 1} 】`);
      allText.push(`Município: ${metadata.municipio}`);
      allText.push(`Ano: ${metadata.ano}`);
      allText.push(`Etapa: ${metadata.etapaDescricao}`);

      entries.forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          let formattedValue = String(value);
          
          // Formatar valores numéricos
          if (!isNaN(Number(value)) && value !== '') {
            const num = Number(value);
            if (num >= 0 && num <= 1) {
              formattedValue = `${(num * 100).toFixed(1)}%`;
            } else if (num > 1 && num < 100) {
              formattedValue = `${num.toFixed(2)}`;
            }
          }

          // Traduzir nomes de colunas técnicas para legíveis
          let readableKey = key
            .replace(/_id$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          allText.push(`  • ${readableKey}: ${formattedValue}`);
        }
      });
    });

    allText.push('\n');
  });

  return allText.join('\n');
}

// Criar chunks inteligentes
function createSmartChunks(text: string, metadata: FileMetadata): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1800; // Aumentar um pouco para preservar registros completos
  
  const lines = text.split('\n');
  
  // Cabeçalho contextual para CADA chunk
  const chunkHeader = `╔═══════════════════════════════════════════════════════╗
║ IDEB ${metadata.ano} - ${metadata.etapaDescricao}
║ Município: ${metadata.municipio} (IBGE: ${metadata.codigoIbge})
╚═══════════════════════════════════════════════════════╝

`;

  let currentChunk = chunkHeader;
  let currentRecord: string[] = [];
  let inRecord = false;

  for (const line of lines) {
    // Detectar início de registro
    if (line.includes('【 Registro')) {
      // Salvar registro anterior se existir
      if (currentRecord.length > 0) {
        const recordText = currentRecord.join('\n');
        
        if ((currentChunk + recordText).length > maxChunkSize) {
          // Salvar chunk atual
          if (currentChunk.length > chunkHeader.length + 10) {
            chunks.push(currentChunk.trim());
          }
          // Iniciar novo chunk com o registro
          currentChunk = chunkHeader + recordText + '\n';
        } else {
          currentChunk += recordText + '\n';
        }
      }
      
      // Iniciar novo registro
      currentRecord = [line];
      inRecord = true;
    } else if (inRecord && line.trim() !== '') {
      currentRecord.push(line);
    } else if (line.trim() === '' && currentRecord.length > 0) {
      // Fim do registro
      inRecord = false;
    } else if (!inRecord) {
      // Linhas de cabeçalho/contexto
      if ((currentChunk + line).length > maxChunkSize) {
        if (currentChunk.length > chunkHeader.length + 10) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = chunkHeader + line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
  }

  // Salvar último registro e chunk
  if (currentRecord.length > 0) {
    const recordText = currentRecord.join('\n');
    if ((currentChunk + recordText).length > maxChunkSize) {
      if (currentChunk.length > chunkHeader.length + 10) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = chunkHeader + recordText;
    } else {
      currentChunk += recordText;
    }
  }

  if (currentChunk.length > chunkHeader.length + 10) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > chunkHeader.length + 20);
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

// Deletar chunks/embeddings antigos
async function deleteOldChunksAndEmbeddings(documentId: string): Promise<void> {
  // Buscar versões
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', documentId);

  if (versions && versions.length > 0) {
    for (const version of versions) {
      // Buscar chunks
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id);

      if (chunks && chunks.length > 0) {
        // Deletar embeddings
        for (const chunk of chunks) {
          await supabase
            .from('document_embeddings')
            .delete()
            .eq('document_chunk_id', chunk.id);
        }

        // Deletar chunks
        await supabase
          .from('document_chunks')
          .delete()
          .eq('document_version_id', version.id);
      }

      // Deletar versão
      await supabase
        .from('document_versions')
        .delete()
        .eq('id', version.id);
    }
  }
}

// Processar arquivo IDEB
async function processIDEBFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(fileName);
  
  log(`\n📄 Reprocessando: ${fileName}`, 'cyan');
  log(`   Etapa: ${metadata.etapaDescricao}`, 'blue');

  try {
    // 1. Buscar documento existente
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('name', fileName)
      .eq('domain', 'INDICADORES_EDUCACIONAIS')
      .eq('subdomain', 'IDEB')
      .eq('metadata_year', 2023);

    if (!existingDocs || existingDocs.length === 0) {
      log(`   ⚠️  Documento não encontrado no banco. Pulando...`, 'yellow');
      return;
    }

    const documentId = existingDocs[0].id;
    log(`   📋 Documento ID: ${documentId}`, 'blue');

    // 2. Deletar chunks e embeddings antigos
    log('   🗑️  Removendo chunks antigos...', 'yellow');
    await deleteOldChunksAndEmbeddings(documentId);

    // 3. Extrair texto estruturado
    log('   📖 Extraindo texto estruturado...', 'yellow');
    const structuredText = excelToStructuredText(filePath, metadata);
    log(`   Texto extraído: ${structuredText.length.toLocaleString()} caracteres`, 'blue');

    // 4. Criar chunks inteligentes
    const chunks = createSmartChunks(structuredText, metadata);
    log(`   📦 Chunks criados: ${chunks.length}`, 'blue');

    if (chunks.length === 0) {
      log(`   ⚠️  Nenhum chunk criado. Pulando...`, 'yellow');
      return;
    }

    // 5. Criar nova versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        status: 'PROCESSING',
        extracted_text_length: structuredText.length,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 6. Processar chunks com embeddings
    log('   🔄 Indexando chunks com embeddings...', 'yellow');
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
            tipo: 'ideb',
            municipio: metadata.municipio,
            ano: metadata.ano,
            etapa: metadata.etapa,
          },
        })
        .select()
        .single();

      if (chunkError) {
        log(`   ❌ Erro ao criar chunk ${i}: ${chunkError.message}`, 'red');
        throw chunkError;
      }

      // Gerar embedding
      const embedding = await generateEmbedding(chunkContent);

      // Salvar embedding
      const { error: embError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
          tokens_used: Math.ceil(chunkContent.length / 4),
        });

      if (embError) {
        log(`   ❌ Erro ao criar embedding ${i}: ${embError.message}`, 'red');
        throw embError;
      }

      log(`   ✅ Chunk ${i + 1}/${chunks.length} indexado`, 'green');
    }

    // 7. Atualizar status da versão
    await supabase
      .from('document_versions')
      .update({
        status: 'COMPLETED',
        indexed: true,
      })
      .eq('id', version.id);

    log('   ✅ Documento reprocessado com sucesso!', 'green');
    
  } catch (error: any) {
    log(`   ❌ Erro: ${error.message}`, 'red');
    throw error;
  }
}

// Main
async function main() {
  log('\n🚀 REINDEXAÇÃO ESTRUTURADA - IDEB 2023\n', 'cyan');
  
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    log('❌ Diretório downloads não encontrado!', 'red');
    return;
  }

  // Buscar apenas arquivos IDEB 2023
  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.includes('ideb') && f.includes('2023') && f.endsWith('.xlsx'))
    .map(f => path.join(DOWNLOADS_DIR, f));

  log(`📊 Encontrados ${files.length} arquivos IDEB 2023\n`, 'green');

  if (files.length === 0) {
    log('⚠️  Nenhum arquivo IDEB 2023 encontrado!', 'yellow');
    return;
  }

  for (const file of files) {
    await processIDEBFile(file);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa para não sobrecarregar API
  }

  log('\n✅ REINDEXAÇÃO CONCLUÍDA!', 'green');
  log('\n💡 Próximo passo: Testar query novamente no sistema', 'cyan');
}

main().catch(console.error);
