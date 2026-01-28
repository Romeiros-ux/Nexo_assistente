/**
 * Script de Indexação: Cadastro de Trabalhadores
 * 
 * Indexa arquivo Excel com informações de servidores municipais
 * Permite responder perguntas como:
 * - Quantos funcionários existem?
 * - Qual o nome da secretária de educação?
 * - Quem trabalha na Secretaria X?
 */

import 'dotenv/config';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import embeddingService from '../src/services/embedding.service';

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FILE_PATH = path.join(__dirname, 'downloads', 'Cadastro de Trabalhadores.xlsx');

interface Trabalhador {
  nome?: string;
  cargo?: string;
  secretaria?: string;
  lotacao?: string;
  matricula?: string;
  situacao?: string;
  [key: string]: any; // Aceita qualquer outra coluna
}

/**
 * Normaliza nome de coluna (remove acentos, espaços, etc)
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por _
    .trim();
}

/**
 * Lê arquivo Excel e retorna dados
 */
function readExcelFile(filePath: string): Trabalhador[] {
  console.log(`\n📂 Lendo arquivo: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Primeira aba
  const worksheet = workbook.Sheets[sheetName];

  console.log(`✅ Aba encontrada: ${sheetName}`);

  // Converter para JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📊 Total de linhas: ${rawData.length}`);

  // Normalizar nomes de colunas
  const normalizedData = rawData.map((row: any) => {
    const normalized: any = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });

  // Mostrar colunas detectadas
  if (normalizedData.length > 0) {
    console.log('\n🔍 Colunas detectadas:');
    Object.keys(normalizedData[0]).forEach((col, index) => {
      console.log(`  ${index + 1}. ${col}`);
    });
  }

  return normalizedData;
}

/**
 * Cria documento no Supabase
 */
async function createDocument(filename: string): Promise<{ documentId: string; versionId: string }> {
  console.log('\n📝 Criando documento no banco...');

  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      name: 'Cadastro de Trabalhadores do Município',
      file_url: filename,
      document_type: 'REPORT',
      domain: 'TRANSPARENCIA',
      subdomain: 'SERVIDORES',
      keywords: ['servidores', 'funcionários', 'trabalhadores', 'cadastro', 'secretaria', 'educação', 'saquarema'],
      metadata_year: new Date().getFullYear(),
    })
    .select('id')
    .single();

  if (docError) {
    throw new Error(`Erro ao criar documento: ${docError.message}`);
  }

  console.log(`✅ Documento criado: ${docData.id}`);

  // Criar versão do documento
  const { data: versionData, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: docData.id,
      version_number: 1,
      status: 'PROCESSING',
      extraction_method: 'xlsx',
    })
    .select('id')
    .single();

  if (versionError) {
    throw new Error(`Erro ao criar versão: ${versionError.message}`);
  }

  console.log(`✅ Versão criada: ${versionData.id}`);

  return {
    documentId: docData.id,
    versionId: versionData.id,
  };
}

/**
 * Gera chunks de texto otimizados para busca
 */
function generateChunks(trabalhadores: Trabalhador[]): string[] {
  const chunks: string[] = [];

  // CHUNK 1: Resumo geral COM INFORMAÇÕES DE VÍNCULOS
  const total = trabalhadores.length;
  const divisoes = [...new Set(trabalhadores.map(t => t.nome_divisao).filter(Boolean))];
  const cargos = [...new Set(trabalhadores.map(t => t.nome_cargo_atual).filter(Boolean))];
  const vinculos = [...new Set(trabalhadores.map(t => t.nome_vinculo).filter(Boolean))];
  
  // Contar por tipo de vínculo
  const porVinculo: Record<string, number> = {};
  trabalhadores.forEach(t => {
    const vinculo = t.nome_vinculo || 'Não informado';
    porVinculo[vinculo] = (porVinculo[vinculo] || 0) + 1;
  });

  const vinculosText = Object.entries(porVinculo)
    .sort((a, b) => b[1] - a[1])
    .map(([vinculo, count]) => `  - ${vinculo}: ${count} funcionários`)
    .join('\n');

  chunks.push(`
RESUMO DO CADASTRO DE TRABALHADORES DO MUNICÍPIO DE SAQUAREMA:

Total de trabalhadores/servidores: ${total} funcionários
Número de divisões/secretarias: ${divisoes.length}
Número de cargos diferentes: ${cargos.length}
Tipos de vínculos: ${vinculos.length}

DISTRIBUIÇÃO POR TIPO DE VÍNCULO:
${vinculosText}

Este cadastro contém informações completas sobre todos os funcionários e servidores municipais de Saquarema, incluindo nome, cargo, divisão/secretaria, matrícula, tipo de vínculo, contrato, salário e outras informações funcionais.
`.trim());

  // CHUNK 2: Cargos de gestão/liderança (Secretários, Diretores, etc) - COM TODAS AS COLUNAS
  const gestores = trabalhadores.filter(t => 
    t.nome_cargo_atual && (
      t.nome_cargo_atual.toLowerCase().includes('secretári') ||
      t.nome_cargo_atual.toLowerCase().includes('secret') ||
      t.nome_cargo_atual.toLowerCase().includes('diretor') ||
      t.nome_cargo_atual.toLowerCase().includes('coordenador') ||
      t.nome_cargo_atual.toLowerCase().includes('gestor') ||
      t.nome_cargo_atual.toLowerCase().includes('superintend') ||
      t.nome_cargo_atual.toLowerCase().includes('presiden')
    )
  );

  if (gestores.length > 0) {
    const gestoresText = gestores.slice(0, 100).map(g => 
      `- ${g.nome || 'Nome não informado'} | Cargo: ${g.nome_cargo_atual} | Divisão: ${g.nome_divisao || 'Não informada'} | Vínculo: ${g.nome_vinculo || 'N/A'} | Matrícula: ${g.matricula || 'N/A'}`
    ).join('\n');

    chunks.push(`
CARGOS DE GESTÃO E LIDERANÇA NO MUNICÍPIO DE SAQUAREMA:

Total de cargos de gestão/liderança: ${gestores.length}

Lista dos principais gestores e líderes (com informações completas):
${gestoresText}
${gestores.length > 100 ? `\n(Mostrando 100 de ${gestores.length} gestores)` : ''}
`.trim());
  }

  // CHUNK 3: Especificamente quem é o Secretário de Educação - COM TODAS AS COLUNAS
  const secretariosEducacao = trabalhadores.filter(t => 
    t.nome_cargo_atual && 
    (t.nome_cargo_atual.toLowerCase().includes('secretári') || t.nome_cargo_atual.toLowerCase().includes('secret')) &&
    (
      (t.nome_divisao && t.nome_divisao.toLowerCase().includes('educação')) ||
      (t.nome_cargo_atual && t.nome_cargo_atual.toLowerCase().includes('educação'))
    )
  );

  if (secretariosEducacao.length > 0) {
    const secText = secretariosEducacao.map(s => 
      `- ${s.nome || 'Nome não informado'} | Cargo: ${s.nome_cargo_atual} | Divisão: ${s.nome_divisao || 'Não informada'} | Vínculo: ${s.nome_vinculo || 'N/A'} | Matrícula: ${s.matricula || 'N/A'} | Contrato: ${s.contrato || 'N/A'} | Admissão: ${s.dtadmissao || 'N/A'}`
    ).join('\n');

    chunks.push(`
SECRETÁRIO(A) DE EDUCAÇÃO DO MUNICÍPIO DE SAQUAREMA:

${secText}

Este(a) é o(a) responsável pela Secretaria de Educação do município.
`.trim());
  }

  // CHUNK 4: Funcionários da Secretaria de Educação - COM TODAS AS COLUNAS
  const educacao = trabalhadores.filter(t => 
    t.nome_divisao && t.nome_divisao.toLowerCase().includes('educação')
  );

  if (educacao.length > 0) {
    // Contar por vínculo na educação
    const educacaoPorVinculo: Record<string, number> = {};
    educacao.forEach(e => {
      const vinculo = e.nome_vinculo || 'Não informado';
      educacaoPorVinculo[vinculo] = (educacaoPorVinculo[vinculo] || 0) + 1;
    });

    const vinculosEducacaoText = Object.entries(educacaoPorVinculo)
      .sort((a, b) => b[1] - a[1])
      .map(([vinculo, count]) => `  - ${vinculo}: ${count} funcionários`)
      .join('\n');

    const educacaoSample = educacao.slice(0, 50).map(e => 
      `- ${e.nome || 'N/A'} | Cargo: ${e.nome_cargo_atual || 'N/A'} | Vínculo: ${e.nome_vinculo || 'N/A'} | Mat: ${e.matricula || 'N/A'}`
    ).join('\n');

    chunks.push(`
TRABALHADORES DA SECRETARIA DE EDUCAÇÃO:

Total de funcionários na Secretaria de Educação: ${educacao.length}

DISTRIBUIÇÃO POR TIPO DE VÍNCULO:
${vinculosEducacaoText}

Amostra de funcionários (50 primeiros):
${educacaoSample}
`.trim());
  }

  // CHUNK 5: Funcionários por tipo de vínculo (CONTRATO TEMPORÁRIO, EFETIVO, etc)
  vinculos.forEach(vinculo => {
    if (!vinculo) return;

    const funcionariosVinculo = trabalhadores.filter(t => t.nome_vinculo === vinculo);
    
    // Dividir em grupos de 100
    for (let i = 0; i < funcionariosVinculo.length; i += 100) {
      const grupo = funcionariosVinculo.slice(i, i + 100);
      const funcionariosText = grupo.map(f => 
        `- ${f.nome || 'N/A'} | Cargo: ${f.nome_cargo_atual || 'N/A'} | Divisão: ${f.nome_divisao || 'N/A'} | Mat: ${f.matricula || 'N/A'}`
      ).join('\n');

      chunks.push(`
FUNCIONÁRIOS COM VÍNCULO: ${vinculo.toUpperCase()} (${i + 1}-${i + grupo.length} de ${funcionariosVinculo.length}):

Total com este tipo de vínculo: ${funcionariosVinculo.length}

Lista de funcionários:
${funcionariosText}
`.trim());
    }
  });

  // CHUNK 4+: Dividir por divisão/secretaria (chunks menores) - COM TODAS AS COLUNAS
  divisoes.forEach(divisao => {
    if (!divisao) return;

    const funcionarios = trabalhadores.filter(t => t.nome_divisao === divisao);
    
    // Dividir em grupos de 50 funcionários
    for (let i = 0; i < funcionarios.length; i += 50) {
      const grupo = funcionarios.slice(i, i + 50);
      const funcionariosText = grupo.map(f => 
        `- ${f.nome || 'N/A'} | Cargo: ${f.nome_cargo_atual || 'N/A'} | Vínculo: ${f.nome_vinculo || 'N/A'} | Mat: ${f.matricula || 'N/A'} | Contrato: ${f.contrato || 'N/A'}`
      ).join('\n');

      chunks.push(`
FUNCIONÁRIOS DA DIVISÃO/SECRETARIA: ${divisao.toUpperCase()} (${i + 1}-${i + grupo.length} de ${funcionarios.length}):

Total nesta divisão: ${funcionarios.length} funcionários

Lista de funcionários:
${funcionariosText}
`.trim());
    }
  });

  console.log(`\n📦 Total de chunks gerados: ${chunks.length}`);
  return chunks;
}

/**
 * Indexa chunks no Supabase
 */
async function indexChunks(versionId: string, chunks: string[]): Promise<void> {
  console.log('\n🔄 Iniciando indexação...');

  let indexed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;

    try {
      // Gerar embedding
      const embeddingResult = await embeddingService.generateEmbedding(chunk);

      // Inserir chunk
      const { data: chunkData, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: versionId,
          chunk_index: chunkNumber,
          content: chunk,
          metadata: { tokens: embeddingResult.tokens },
        })
        .select('id')
        .single();

      if (chunkError) {
        console.error(`❌ Erro ao inserir chunk ${chunkNumber}:`, chunkError.message);
        continue;
      }

      // Inserir embedding
      const { error: embError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunkData.id,
          embedding: embeddingResult.embedding,
          model: embeddingResult.model,
          tokens_used: embeddingResult.tokens,
        });

      if (embError) {
        console.error(`❌ Erro ao inserir embedding ${chunkNumber}:`, embError.message);
        continue;
      }

      indexed++;
      console.log(`✅ Chunk ${chunkNumber}/${chunks.length} indexado (${embeddingResult.tokens} tokens)`);

      // Pequeno delay para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error: any) {
      console.error(`❌ Erro ao processar chunk ${chunkNumber}:`, error.message);
    }
  }

  console.log(`\n🎉 Indexação concluída: ${indexed}/${chunks.length} chunks`);
}

/**
 * Execução principal
 */
async function main() {
  console.log('🚀 INDEXAÇÃO: Cadastro de Trabalhadores\n');
  console.log('='['repeat'](60));

  try {
    // 1. Ler arquivo Excel
    const trabalhadores = readExcelFile(FILE_PATH);

    if (trabalhadores.length === 0) {
      console.error('❌ Nenhum dado encontrado no arquivo');
      process.exit(1);
    }

    // 2. Criar documento e versão
    const { documentId, versionId } = await createDocument('Cadastro de Trabalhadores.xlsx');

    // 3. Gerar chunks otimizados
    const chunks = generateChunks(trabalhadores);

    // 4. Indexar chunks
    await indexChunks(versionId, chunks);

    // 5. Marcar versão como completa
    await supabase
      .from('document_versions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', versionId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!\n');
    console.log('Agora você pode fazer perguntas como:');
    console.log('  - Quantos funcionários existem?');
    console.log('  - Qual o nome da secretária de educação?');
    console.log('  - Quem trabalha na Secretaria de Educação?');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    process.exit(1);
  }
}

// Executar
main();
