/**
 * QEDU SCRAPER - Dados Educacionais de Saquarema
 * 
 * Extrai dados do QEdu.org.br:
 * 1. Dados gerais do município (IDEB, matrículas, infraestrutura)
 * 2. Lista de todas as escolas municipais
 * 3. Dados detalhados de cada escola (IDEB, professores, alunos, infraestrutura)
 * 
 * Uso:
 * npx tsx backend/scripts/qedu-scraper.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';
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

const MUNICIPIO_ID = '3305505'; // Código IBGE de Saquarema
const BASE_URL = `https://qedu.org.br/municipio/${MUNICIPIO_ID}-saquarema`;

interface School {
  name: string;
  inep_code: string;
  url: string;
}

interface QEduData {
  municipio: {
    nome: string;
    uf: string;
    ideb: any;
    matriculas: any;
    infraestrutura: any;
  };
  escolas: Array<{
    nome: string;
    codigo_inep: string;
    ideb: any;
    dados: any;
  }>;
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// ==========================================
// FUNÇÕES DE SCRAPING
// ==========================================

async function fetchHTML(url: string): Promise<string> {
  try {
    console.log(`${colors.blue}[QEdu]${colors.reset} Buscando: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: any) {
    console.error(`${colors.red}[QEdu]${colors.reset} Erro ao buscar ${url}:`, error.message);
    return '';
  }
}

async function extractMunicipioData(): Promise<any> {
  console.log(`\n${colors.cyan}=== EXTRAINDO DADOS DO MUNICÍPIO ===${colors.reset}`);
  
  const municipioData: any = {
    nome: 'Saquarema',
    uf: 'RJ',
    codigo_ibge: MUNICIPIO_ID,
  };

  // 1. Página principal
  const htmlMain = await fetchHTML(BASE_URL);
  if (htmlMain) {
    const $ = cheerio.load(htmlMain);
    
    // Extrair dados gerais
    municipioData.resumo = $('.summary-content').text().trim();
    municipioData.destaques = [];
    $('.highlight-box').each((i, el) => {
      const titulo = $(el).find('.highlight-title').text().trim();
      const valor = $(el).find('.highlight-value').text().trim();
      if (titulo && valor) {
        municipioData.destaques.push({ titulo, valor });
      }
    });
  }

  // 2. IDEB
  const htmlIdeb = await fetchHTML(`${BASE_URL}/ideb`);
  if (htmlIdeb) {
    const $ = cheerio.load(htmlIdeb);
    municipioData.ideb = {
      anos_iniciais: {},
      anos_finais: {},
    };
    
    // Extrair tabelas de IDEB
    $('.ideb-table').each((i, table) => {
      const ano = $(table).find('.year').text().trim();
      const nota = $(table).find('.grade').text().trim();
      const meta = $(table).find('.goal').text().trim();
      
      if (i === 0) { // Anos iniciais
        municipioData.ideb.anos_iniciais[ano] = { nota, meta };
      } else { // Anos finais
        municipioData.ideb.anos_finais[ano] = { nota, meta };
      }
    });
  }

  // 3. Censo Escolar
  const htmlCenso = await fetchHTML(`${BASE_URL}/censo-escolar`);
  if (htmlCenso) {
    const $ = cheerio.load(htmlCenso);
    municipioData.censo = {
      escolas: $('td:contains("Escolas")').next().text().trim(),
      matriculas: $('td:contains("Matrículas")').next().text().trim(),
      docentes: $('td:contains("Docentes")').next().text().trim(),
    };
  }

  // 4. Pessoas (professores, gestores)
  const htmlPessoas = await fetchHTML(`${BASE_URL}/pessoas`);
  if (htmlPessoas) {
    const $ = cheerio.load(htmlPessoas);
    municipioData.pessoas = {
      professores: {},
      gestores: {},
    };
    
    $('.metric-box').each((i, el) => {
      const label = $(el).find('.metric-label').text().trim();
      const value = $(el).find('.metric-value').text().trim();
      if (label.includes('Professor')) {
        municipioData.pessoas.professores[label] = value;
      } else if (label.includes('Diretor') || label.includes('Coordenador')) {
        municipioData.pessoas.gestores[label] = value;
      }
    });
  }

  console.log(`${colors.green}✓${colors.reset} Dados do município extraídos`);
  return municipioData;
}

async function extractSchoolsList(): Promise<School[]> {
  console.log(`\n${colors.cyan}=== LISTANDO ESCOLAS ===${colors.reset}`);
  
  const schools: School[] = [];
  const html = await fetchHTML(`${BASE_URL}/escolas`);
  
  if (!html) {
    console.log(`${colors.yellow}⚠${colors.reset} Não foi possível listar escolas`);
    return schools;
  }

  const $ = cheerio.load(html);
  
  // QEdu lista escolas em tabelas ou cards
  $('.school-item, .escola-item, tr.escola').each((i, el) => {
    const name = $(el).find('.school-name, .nome-escola, td:first').text().trim();
    const link = $(el).find('a').attr('href');
    
    if (name && link) {
      // Extrair código INEP da URL (ex: /escola/33051234-escola-municipal)
      const inepMatch = link.match(/\/escola\/(\d+)/);
      const inep_code = inepMatch ? inepMatch[1] : '';
      
      schools.push({
        name,
        inep_code,
        url: link.startsWith('http') ? link : `https://qedu.org.br${link}`,
      });
    }
  });

  console.log(`${colors.green}✓${colors.reset} ${schools.length} escolas encontradas`);
  return schools;
}

async function extractSchoolData(school: School): Promise<any> {
  console.log(`${colors.blue}[Escola]${colors.reset} ${school.name}`);
  
  const schoolData: any = {
    nome: school.name,
    codigo_inep: school.inep_code,
    url: school.url,
  };

  const html = await fetchHTML(school.url);
  if (!html) return schoolData;

  const $ = cheerio.load(html);

  // Dados gerais da escola
  schoolData.endereco = $('.school-address').text().trim();
  schoolData.dependencia = $('.school-dependency').text().trim();
  
  // IDEB da escola
  schoolData.ideb = {};
  $('.ideb-value').each((i, el) => {
    const ano = $(el).find('.year').text().trim();
    const nota = $(el).find('.grade').text().trim();
    if (ano && nota) {
      schoolData.ideb[ano] = nota;
    }
  });

  // Infraestrutura
  schoolData.infraestrutura = [];
  $('.infrastructure-item, .recurso-item').each((i, el) => {
    const recurso = $(el).text().trim();
    if (recurso) {
      schoolData.infraestrutura.push(recurso);
    }
  });

  // Matrículas
  schoolData.matriculas = {};
  $('td:contains("Matrículas")').each((i, el) => {
    const etapa = $(el).prev().text().trim();
    const valor = $(el).text().trim();
    if (etapa && valor) {
      schoolData.matriculas[etapa] = valor;
    }
  });

  // Professores
  schoolData.professores = $('td:contains("Docentes")').next().text().trim();

  console.log(`${colors.green}  ✓${colors.reset} Dados extraídos`);
  return schoolData;
}

// ==========================================
// CHUNKING E EMBEDDINGS
// ==========================================

function createChunks(data: any, source: string): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1500;

  // Converter objeto em texto estruturado
  const textContent = JSON.stringify(data, null, 2)
    .replace(/[{}[\]"]/g, '')
    .replace(/,\n/g, '\n')
    .trim();

  // Split em chunks
  const lines = textContent.split('\n');
  let currentChunk = `Fonte: ${source}\n\n`;

  for (const line of lines) {
    if ((currentChunk + line).length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = `Fonte: ${source}\n\n${line}\n`;
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1536,
    });
    return response.data[0].embedding;
  } catch (error: any) {
    console.error(`${colors.red}[Embedding]${colors.reset} Erro:`, error.message);
    throw error;
  }
}

function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ==========================================
// SALVAR NO BANCO
// ==========================================

async function saveToDatabase(data: QEduData): Promise<void> {
  console.log(`\n${colors.cyan}=== SALVANDO NO BANCO ===${colors.reset}`);

  // 1. Salvar dados do município
  const municipioContent = JSON.stringify(data.municipio, null, 2);

  // Criar documento
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      name: `QEdu - Município de Saquarema`,
      document_type: 'DATA',
      source_url: BASE_URL,
      status: 'ACTIVE',
      metadata: {
        source: 'QEdu',
        tipo: 'município',
        codigo_ibge: MUNICIPIO_ID,
      },
    })
    .select()
    .single();

  if (docError) {
    console.error(`${colors.red}✗${colors.reset} Erro ao criar documento:`, docError);
    return;
  }

    // Criar versão
    const { data: version } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        content: municipioContent,
        version: 1,
        indexed: false,
      })
      .select()
      .single();

    // Criar chunks
    const chunks = createChunks(data.municipio, 'QEdu - Município');
    
    for (const chunkContent of chunks) {
      const { data: chunk } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          content: chunkContent,
          chunk_index: chunks.indexOf(chunkContent),
          metadata: { tipo: 'município' },
        })
        .select()
        .single();

      // Gerar embedding
      const embedding = await generateEmbedding(chunkContent);
      
      await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
        });
    }

    // Marcar como indexado
    await supabase
      .from('document_versions')
      .update({ indexed: true })
      .eq('id', version.id);

    console.log(`${colors.green}✓${colors.reset} Município: ${chunks.length} chunks, ${chunks.length} embeddings`);

  // 2. Salvar dados de cada escola
  for (const escola of data.escolas) {
    const escolaContent = JSON.stringify(escola, null, 2);

    const { data: document } = await supabase
      .from('documents')
      .insert({
        name: `QEdu - ${escola.nome}`,
        document_type: 'DATA',
        source_url: `https://qedu.org.br/escola/${escola.codigo_inep}`,
        status: 'ACTIVE',
        metadata: {
          source: 'QEdu',
          tipo: 'escola',
          codigo_inep: escola.codigo_inep,
        },
      })
      .select()
      .single();

    const { data: version } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        content: escolaContent,
        version: 1,
        indexed: false,
      })
      .select()
      .single();

    const chunks = createChunks(escola, `QEdu - ${escola.nome}`);
    
    for (const chunkContent of chunks) {
      const { data: chunk } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          content: chunkContent,
          chunk_index: chunks.indexOf(chunkContent),
          metadata: { 
            tipo: 'escola',
            codigo_inep: escola.codigo_inep,
          },
        })
        .select()
        .single();

      const embedding = await generateEmbedding(chunkContent);
      
      await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
        });
    }

    await supabase
      .from('document_versions')
      .update({ indexed: true })
      .eq('id', version.id);

    console.log(`${colors.green}✓${colors.reset} ${escola.nome}: ${chunks.length} chunks`);
  }

  console.log(`\n${colors.green}🎉 INDEXAÇÃO CONCLUÍDA!${colors.reset}`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log(`\n${colors.green}=================================`);
  console.log(`   QEDU SCRAPER - SAQUAREMA`);
  console.log(`=================================${colors.reset}\n`);

  try {
    // 1. Extrair dados do município
    const municipioData = await extractMunicipioData();

    // 2. Listar todas as escolas
    const schools = await extractSchoolsList();

    // 3. Extrair dados de cada escola (limitar para teste)
    const escolasData = [];
    const maxSchools = 5; // Limitar para teste inicial
    
    for (const school of schools.slice(0, maxSchools)) {
      const data = await extractSchoolData(school);
      escolasData.push(data);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }

    // 4. Salvar tudo no banco
    const qeduData: QEduData = {
      municipio: municipioData,
      escolas: escolasData,
    };

    await saveToDatabase(qeduData);

  } catch (error: any) {
    console.error(`\n${colors.red}❌ ERRO:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
