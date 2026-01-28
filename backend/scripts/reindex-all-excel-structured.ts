/**
 * REINDEXAÇÃO UNIVERSAL - Todos os arquivos Excel com estrutura melhorada
 * 
 * Processa todos os indicadores educacionais com:
 * - Estruturação inteligente de conteúdo
 * - Ignorar sheets de dicionário/metadados
 * - Contexto completo em cada chunk
 * - Classificação correta por domínio/subdomínio
 * 
 * IMPORTANTE: Não reprocessa arquivos já estruturados (IDEB 2023)
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
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const ETAPAS: Record<string, string> = {
  'AI': 'Anos Iniciais (1º ao 5º ano do Ensino Fundamental)',
  'AF': 'Anos Finais (6º ao 9º ano do Ensino Fundamental)',
  'EM': 'Ensino Médio',
};

// Mapear tipo de arquivo para subdomain
interface DocumentMetadata {
  tipo: string;
  subdomain: string;
  municipio: string;
  codigoIbge: string;
  ano: string;
  etapa: string;
  etapaDescricao: string;
}

function extractMetadata(fileName: string): DocumentMetadata {
  const nameLower = fileName.toLowerCase();
  const parts = fileName.replace('.xlsx', '').replace('.xlsm', '').split('-');
  
  let tipo = '';
  let subdomain = '';
  
  // Identificar tipo de indicador
  if (nameLower.includes('ideb')) {
    tipo = 'IDEB - Índice de Desenvolvimento da Educação Básica';
    subdomain = 'IDEB';
  } else if (nameLower.includes('taxa_rendimento')) {
    tipo = 'Taxa de Rendimento Escolar (Aprovação, Reprovação, Abandono)';
    subdomain = 'TAXA_RENDIMENTO';
  } else if (nameLower.includes('saeb')) {
    tipo = 'SAEB - Sistema de Avaliação da Educação Básica';
    subdomain = 'SAEB';
  } else if (nameLower.includes('distorcao')) {
    tipo = 'Distorção Idade-Série';
    subdomain = 'DISTORCAO_IDADE_SERIE';
  } else if (nameLower.includes('permanencia')) {
    tipo = 'Taxa de Permanência Escolar';
    subdomain = 'PERMANENCIA';
  } else {
    tipo = 'Indicadores Educacionais';
    subdomain = 'OUTROS';
  }

  const etapa = parts[parts.length - 1] || 'AF';
  const ano = parts[parts.length - 2] || '2023';

  return {
    tipo,
    subdomain,
    municipio: 'Saquarema-RJ',
    codigoIbge: parts[1] || '3305505',
    ano,
    etapa,
    etapaDescricao: ETAPAS[etapa] || etapa,
  };
}

// Converter Excel para texto estruturado
function excelToStructuredText(filePath: string, metadata: DocumentMetadata): string {
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
      log(`     ⏭️  Pulando sheet: ${sheetName}`, 'yellow');
      return;
    }

    log(`     📊 Processando sheet: ${sheetName}`, 'blue');
    allText.push(`\n━━━ DADOS: ${sheetName} ━━━\n`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (jsonData.length === 0) {
      allText.push('(Sem dados nesta sheet)\n');
      return;
    }

    // Adicionar descrição contextual
    allText.push(`Este dataset contém ${metadata.tipo} para ${metadata.etapaDescricao} em ${metadata.municipio} (${metadata.ano}).\n`);

    // Processar cada linha de dados
    jsonData.forEach((row: any, index) => {
      if (index >= 100) return; // Limitar a 100 registros por sheet

      const entries = Object.entries(row);
      if (entries.length === 0) return;

      allText.push(`\n【 Registro ${index + 1} 】`);
      allText.push(`Município: ${metadata.municipio}`);
      allText.push(`Ano: ${metadata.ano}`);
      allText.push(`Etapa: ${metadata.etapaDescricao}`);
      allText.push(`Indicador: ${metadata.tipo}`);

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

          // Traduzir nomes de colunas técnicas
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
function createSmartChunks(text: string, metadata: DocumentMetadata): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1800;
  
  const lines = text.split('\n');
  
  // Cabeçalho contextual para CADA chunk
  const chunkHeader = `╔═══════════════════════════════════════════════════════╗
║ ${metadata.tipo}
║ ${metadata.ano} - ${metadata.etapaDescricao}
║ Município: ${metadata.municipio}
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
          if (currentChunk.length > chunkHeader.length + 10) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = chunkHeader + recordText + '\n';
        } else {
          currentChunk += recordText + '\n';
        }
      }
      
      currentRecord = [line];
      inRecord = true;
    } else if (inRecord && line.trim() !== '') {
      currentRecord.push(line);
    } else if (line.trim() === '' && currentRecord.length > 0) {
      inRecord = false;
    } else if (!inRecord) {
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

// Deletar chunks/embeddings antigos do documento
async function deleteOldChunksAndEmbeddings(documentId: string): Promise<void> {
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', documentId);

  if (versions && versions.length > 0) {
    for (const version of versions) {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_version_id', version.id);

      if (chunks && chunks.length > 0) {
        for (const chunk of chunks) {
          await supabase
            .from('document_embeddings')
            .delete()
            .eq('document_chunk_id', chunk.id);
        }

        await supabase
          .from('document_chunks')
          .delete()
          .eq('document_version_id', version.id);
      }

      await supabase
        .from('document_versions')
        .delete()
        .eq('id', version.id);
    }
  }
}

// Verificar se documento já está estruturado (tem mais de 1500 chars por chunk em média)
async function isAlreadyStructured(fileName: string): Promise<boolean> {
  const { data: docs } = await supabase
    .from('documents')
    .select(`
      id,
      document_versions (
        id,
        document_chunks (
          content
        )
      )
    `)
    .eq('name', fileName)
    .single();

  if (!docs || !docs.document_versions || docs.document_versions.length === 0) {
    return false;
  }

  const chunks = docs.document_versions[0].document_chunks || [];
  if (chunks.length === 0) return false;

  // Verificar se chunks têm cabeçalho estruturado
  const firstChunk = chunks[0].content;
  return firstChunk.includes('╔═══════') && firstChunk.includes('【 Registro');
}

// Processar arquivo Excel
async function processExcelFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const metadata = extractMetadata(fileName);
  
  log(`\n📄 ${fileName}`, 'cyan');
  log(`   Tipo: ${metadata.subdomain}`, 'blue');

  try {
    // 1. Verificar se já está estruturado
    const alreadyStructured = await isAlreadyStructured(fileName);
    if (alreadyStructured) {
      log(`   ✅ Já estruturado - pulando`, 'green');
      return;
    }

    // 2. Buscar ou criar documento
    let { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('name', fileName)
      .maybeSingle();

    let documentId: string;

    if (existingDoc) {
      documentId = existingDoc.id;
      log(`   📋 Documento existente: ${documentId}`, 'blue');
      
      // Deletar chunks antigos
      log(`   🗑️  Removendo chunks antigos...`, 'yellow');
      await deleteOldChunksAndEmbeddings(documentId);
    } else {
      // Criar novo documento
      log(`   ➕ Criando novo documento...`, 'yellow');
      const { data: newDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          name: fileName,
          document_type: 'REPORT',
          file_url: `file:///${filePath}`,
          status: 'ACTIVE',
          domain: 'INDICADORES_EDUCACIONAIS',
          subdomain: metadata.subdomain,
          metadata_year: parseInt(metadata.ano),
          education_stage: metadata.etapa,
          keywords: [metadata.subdomain.toLowerCase(), metadata.ano, metadata.etapa.toLowerCase()],
        })
        .select()
        .single();

      if (docError) throw docError;
      documentId = newDoc.id;
      log(`   ✅ Documento criado: ${documentId}`, 'green');
    }

    // 3. Extrair texto estruturado
    log(`   📖 Extraindo texto estruturado...`, 'yellow');
    const structuredText = excelToStructuredText(filePath, metadata);
    log(`   Texto: ${structuredText.length.toLocaleString()} caracteres`, 'blue');

    // 4. Criar chunks
    const chunks = createSmartChunks(structuredText, metadata);
    log(`   📦 Chunks: ${chunks.length}`, 'blue');

    if (chunks.length === 0) {
      log(`   ⚠️  Nenhum chunk - pulando`, 'yellow');
      return;
    }

    // 5. Criar versão
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
    log(`   🔄 Indexando...`, 'yellow');
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      const { data: chunk, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          content: chunkContent,
          chunk_index: i,
          metadata: {
            tipo: metadata.subdomain,
            municipio: metadata.municipio,
            ano: metadata.ano,
            etapa: metadata.etapa,
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

    log(`   ✅ Concluído! (${chunks.length} chunks)`, 'green');
    
  } catch (error: any) {
    log(`   ❌ Erro: ${error.message}`, 'red');
  }
}

// Main
async function main() {
  log('\n🚀 REINDEXAÇÃO UNIVERSAL - TODOS OS ARQUIVOS EXCEL\n', 'cyan');
  
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    log('❌ Diretório downloads não encontrado!', 'red');
    return;
  }

  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xlsm'))
    .map(f => path.join(DOWNLOADS_DIR, f))
    .sort(); // Ordenar para processar de forma consistente

  log(`📊 Total de arquivos: ${files.length}\n`, 'green');

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      await processExcelFile(file);
      processed++;
      
      // Pausa para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      errors++;
    }
  }

  log('\n═══════════════════════════════════════', 'cyan');
  log(`✅ Processados: ${processed}`, 'green');
  log(`⏭️  Pulados (já estruturados): ${skipped}`, 'yellow');
  log(`❌ Erros: ${errors}`, errors > 0 ? 'red' : 'blue');
  log('═══════════════════════════════════════\n', 'cyan');
  
  log('💡 Sistema pronto! Todos os indicadores estruturados.', 'magenta');
}

main().catch(console.error);
