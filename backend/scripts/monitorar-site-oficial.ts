/**
 * Script para monitorar o site oficial do Diário Oficial de Saquarema
 * e baixar automaticamente novos PDFs
 * 
 * Site: https://dos.saquarema.rj.gov.br/
 * 
 * Fluxo:
 * 1. Acessa o site oficial
 * 2. Identifica PDFs disponíveis
 * 3. Compara com os já baixados (cache)
 * 4. Baixa novos PDFs
 * 5. Faz upload automático
 * 6. Arquiva PDFs antigos
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { obterTokenAdmin } from './auth-helper';

const SITE_URL = 'https://dos.saquarema.rj.gov.br/';
const DOWNLOADS_PATH = path.resolve(__dirname, 'downloads');
const CACHE_FILE = path.resolve(__dirname, '.diarios-cache.json');
const MANTER_ULTIMOS = 10; // Manter apenas os 10 PDFs mais recentes

interface CacheData {
  downloadedPDFs: Array<{
    filename: string;
    url: string;
    downloadedAt: string;
  }>;
  lastCheck: string;
}

interface PDFInfo {
  filename: string;
  url: string;
  edicao: string;
  ano: string;
}

/**
 * Carrega cache de PDFs já baixados
 */
function carregarCache(): CacheData {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️  Criando novo cache...');
  }
  
  return {
    downloadedPDFs: [],
    lastCheck: new Date().toISOString()
  };
}

/**
 * Salva cache de PDFs baixados
 */
function salvarCache(cache: CacheData) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Busca PDFs disponíveis no site oficial
 */
async function buscarPDFsNoSite(): Promise<PDFInfo[]> {
  try {
    console.log('🌐 Acessando site oficial...');
    console.log(`   ${SITE_URL}\n`);

    const response = await axios.get(SITE_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const pdfs: PDFInfo[] = [];

    // Procurar por links de PDFs
    // Adaptar seletores conforme a estrutura do site
    $('a[href*=".pdf"], a[href*="D.O.S"]').each((i, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();

      if (href && (href.includes('.pdf') || href.includes('D.O.S'))) {
        // Construir URL completa se for relativa
        const url = href.startsWith('http') ? href : new URL(href, SITE_URL).href;
        
        // Tentar extrair edição e ano do nome do arquivo ou texto
        const match = (href + text).match(/D\.?O\.?S[._\s-]*(\d+)[-_]?(\d+)/i);
        
        if (match) {
          const edicao = match[1];
          const ano = match[2];
          const filename = `D.O.S._${edicao}-${ano}_assinado.pdf`;

          pdfs.push({
            filename,
            url,
            edicao,
            ano
          });
        }
      }
    });

    return pdfs;
  } catch (error: any) {
    console.error('❌ Erro ao acessar o site:', error.message);
    return [];
  }
}

/**
 * Baixa um PDF
 */
async function baixarPDF(pdf: PDFInfo): Promise<boolean> {
  try {
    console.log(`📥 Baixando: ${pdf.filename}`);
    console.log(`   URL: ${pdf.url}`);

    const response = await axios.get(pdf.url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Criar pasta downloads se não existir
    if (!fs.existsSync(DOWNLOADS_PATH)) {
      fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
    }

    const filepath = path.join(DOWNLOADS_PATH, pdf.filename);
    fs.writeFileSync(filepath, response.data);

    console.log(`   ✅ Salvo em: ${filepath}\n`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Erro ao baixar: ${error.message}\n`);
    return false;
  }
}

/**
 * Faz upload de um PDF para o sistema
 */
async function uploadPDF(pdf: PDFInfo, authToken: string): Promise<boolean> {
  try {
    const filepath = path.join(DOWNLOADS_PATH, pdf.filename);
    
    if (!fs.existsSync(filepath)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filepath}`);
      return false;
    }

    // Determinar período baseado na edição
    const edicaoNum = parseInt(pdf.edicao);
    let periodo = { mes: 'janeiro', ano: 2026 };
    
    if (edicaoNum >= 1784 && edicaoNum <= 1807) {
      periodo = { mes: 'dezembro', ano: 2025 };
    } else if (edicaoNum >= 1808 && edicaoNum <= 1833) {
      periodo = { mes: 'janeiro', ano: 2026 };
    }

    const nome = `Diário Oficial de Saquarema - Edição ${pdf.edicao}/${pdf.ano}`;
    const descricao = `Edição ${pdf.edicao} do Diário Oficial de Saquarema, Ano ${pdf.ano}, publicada em ${periodo.mes}/${periodo.ano}. Contém decretos, portarias, leis, editais e atos administrativos oficiais do município. Segunda página contém informações atualizadas sobre prefeito, vice-prefeito e secretários municipais.`;
    
    const tags = [
      'diário oficial',
      'D.O.S',
      `edição ${pdf.edicao}`,
      `ano ${pdf.ano}`,
      periodo.mes,
      periodo.ano.toString(),
      'publicações oficiais',
      'decretos',
      'portarias',
      'leis',
      'editais',
      'autoridades',
      'gestão municipal'
    ];

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filepath));
    formData.append('name', nome);
    formData.append('description', descricao);
    formData.append('tags', JSON.stringify(tags));
    formData.append('domain', 'DIARIO_OFICIAL');
    formData.append('subdomain', 'TEXTOS_COMPLETOS');
    formData.append('document_type', 'OTHER');

    console.log(`📤 Fazendo upload: ${nome}`);
    
    const response = await axios.post('http://127.0.0.1:3001/api/v1/documents/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.status === 201) {
      console.log(`   ✅ Upload concluído!\n`);
      return true;
    } else {
      console.log(`   ❌ Erro: Status ${response.status}\n`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ Erro no upload: ${error.message}\n`);
    return false;
  }
}

/**
 * Arquiva PDFs antigos mantendo apenas os N mais recentes
 */
async function arquivarAntigos() {
  // Importar dinamicamente para evitar dependências circulares
  const { createClient } = require('@supabase/supabase-js');
  const dotenv = require('dotenv');
  
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🔄 Executando manutenção...\n');

  const { data: documentos, error } = await supabase
    .from('documents')
    .select('id, name, uploaded_at, status')
    .eq('domain', 'DIARIO_OFICIAL')
    .eq('subdomain', 'TEXTOS_COMPLETOS')
    .eq('status', 'ACTIVE')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    return;
  }

  if (!documentos || documentos.length <= MANTER_ULTIMOS) {
    console.log(`✅ Total de ${documentos?.length || 0} documentos, dentro do limite de ${MANTER_ULTIMOS}\n`);
    return;
  }

  const processar = documentos.slice(MANTER_ULTIMOS);
  console.log(`📦 Arquivando ${processar.length} documentos antigos...\n`);

  let arquivados = 0;
  for (const doc of processar) {
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: 'ARCHIVED',
        is_public: false
      })
      .eq('id', doc.id);

    if (!updateError) {
      console.log(`✅ Arquivado: ${doc.name}`);
      arquivados++;
    } else {
      console.log(`❌ Erro ao arquivar ${doc.name}: ${updateError.message}`);
    }
  }

  console.log(`\n📊 Total arquivado: ${arquivados} documentos\n`);
}

/**
 * Função principal
 */
async function monitorarSiteOficial() {
  console.log('🤖 MONITORAMENTO DO SITE OFICIAL - DIÁRIO OFICIAL DE SAQUAREMA');
  console.log('═'.repeat(70));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🌐 Site: ${SITE_URL}`);
  console.log('═'.repeat(70));
  console.log('');

  // 1. Carregar cache
  const cache = carregarCache();
  console.log(`📋 Último check: ${new Date(cache.lastCheck).toLocaleString('pt-BR')}`);
  console.log(`📁 PDFs já baixados: ${cache.downloadedPDFs.length}\n`);

  // 2. Buscar PDFs no site
  const pdfsNoSite = await buscarPDFsNoSite();
  
  if (pdfsNoSite.length === 0) {
    console.log('⚠️  Nenhum PDF encontrado no site');
    console.log('💡 Verifique se o site está acessível e se a estrutura HTML não mudou\n');
    return;
  }

  console.log(`📊 Encontrados ${pdfsNoSite.length} PDFs no site\n`);

  // 3. Identificar novos PDFs
  const pdfsJaBaixados = cache.downloadedPDFs.map(p => p.filename);
  const novosPDFs = pdfsNoSite.filter(pdf => !pdfsJaBaixados.includes(pdf.filename));

  if (novosPDFs.length === 0) {
    console.log('✅ Nenhum PDF novo encontrado\n');
  } else {
    console.log(`🆕 Encontrados ${novosPDFs.length} novos PDFs:\n`);
    novosPDFs.forEach((pdf, i) => {
      console.log(`   ${i + 1}. Edição ${pdf.edicao}/${pdf.ano}`);
    });
    console.log('');

    // 4. Baixar novos PDFs
    console.log('═'.repeat(70));
    console.log('📥 BAIXANDO NOVOS PDFs');
    console.log('═'.repeat(70));
    console.log('');

    const baixadosComSucesso: PDFInfo[] = [];
    
    for (const pdf of novosPDFs) {
      const sucesso = await baixarPDF(pdf);
      if (sucesso) {
        baixadosComSucesso.push(pdf);
        cache.downloadedPDFs.push({
          filename: pdf.filename,
          url: pdf.url,
          downloadedAt: new Date().toISOString()
        });
      }
      
      // Pausa de 2 segundos entre downloads
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Downloads: ${baixadosComSucesso.length}/${novosPDFs.length} bem-sucedidos\n`);

    // 5. Fazer upload dos novos PDFs
    if (baixadosComSucesso.length > 0) {
      console.log('═'.repeat(70));
      console.log('📤 FAZENDO UPLOAD DOS NOVOS PDFs');
      console.log('═'.repeat(70));
      console.log('');

      // Login
      console.log('🔐 Fazendo login...\n');
      const auth = await obterTokenAdmin();
      
      if (!auth.success || !auth.token) {
        console.log(`❌ Erro na autenticação: ${auth.error}\n`);
        return;
      }

      console.log(`✅ Login realizado com sucesso!\n`);

      // Upload de cada PDF
      let uploadsSucesso = 0;
      for (const pdf of baixadosComSucesso) {
        const sucesso = await uploadPDF(pdf, auth.token);
        if (sucesso) uploadsSucesso++;
        
        // Pausa de 2 segundos entre uploads
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`📊 Uploads: ${uploadsSucesso}/${baixadosComSucesso.length} bem-sucedidos\n`);
    }
  }

  // 6. Arquivar PDFs antigos
  await arquivarAntigos();

  // 7. Atualizar cache
  cache.lastCheck = new Date().toISOString();
  salvarCache(cache);

  console.log('═'.repeat(70));
  console.log('✅ MONITORAMENTO CONCLUÍDO');
  console.log('═'.repeat(70));
  console.log('\n💡 Para executar automaticamente, agende este script:');
  console.log('   • Windows: Agendador de Tarefas');
  console.log('   • Linux/Mac: Crontab');
  console.log('   • Recomendado: Diariamente às 9h\n');
}

// Executar
monitorarSiteOficial().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
