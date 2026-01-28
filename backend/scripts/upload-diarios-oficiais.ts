/**
 * Script para upload automático de PDFs do Diário Oficial
 * 
 * Lê cada PDF, extrai metadados e faz upload individual
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { obterTokenAdmin } from './auth-helper';

// Configurações
const DOWNLOADS_PATH = path.join(__dirname, 'downloads');
const API_URL = 'http://127.0.0.1:3001/api/v1';

interface PDFInfo {
  filename: string;
  filepath: string;
  edicao: string;
  ano: string;
  numero: string;
}

/**
 * Extrai informações do nome do arquivo
 * Formato: D.O.S._1784-7_assinado.pdf
 * 1784 = número da edição
 * 7 = ano (2025 + 7 = Ano 7)
 */
function extrairInfoDoPDF(filename: string): PDFInfo | null {
  const match = filename.match(/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf/);
  
  if (!match) {
    return null;
  }

  const [_, numero, ano] = match;
  
  return {
    filename,
    filepath: path.join(DOWNLOADS_PATH, filename),
    edicao: numero,
    ano: ano,
    numero: numero
  };
}

/**
 * Determina o período aproximado baseado no número da edição
 */
function obterPeriodo(edicao: string): { mes: string; ano: number } {
  const num = parseInt(edicao);
  
  // Edições 1784-1807: Dezembro 2025
  if (num >= 1784 && num <= 1807) {
    return { mes: 'dezembro', ano: 2025 };
  }
  // Edições 1808-1833: Janeiro 2026
  else if (num >= 1808 && num <= 1833) {
    return { mes: 'janeiro', ano: 2026 };
  }
  
  return { mes: 'desconhecido', ano: 2025 };
}

/**
 * Faz upload de um PDF via API
 */
async function uploadPDF(info: PDFInfo, authToken: string): Promise<boolean> {
  try {
    const periodo = obterPeriodo(info.edicao);
    
    // Preparar metadados
    const nome = `Diário Oficial de Saquarema - Edição ${info.edicao}/${info.ano}`;
    const descricao = `Edição ${info.edicao} do Diário Oficial de Saquarema, Ano ${info.ano}, ${periodo.mes}/${periodo.ano}. Publicações oficiais incluindo decretos, portarias, leis, editais e demais atos administrativos do município.`;
    const tags = [
      'diário oficial',
      'D.O.S',
      `edição ${info.edicao}`,
      `ano ${info.ano}`,
      periodo.mes,
      periodo.ano.toString(),
      'publicações oficiais',
      'decretos',
      'portarias',
      'leis',
      'editais'
    ];

    // Criar FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(info.filepath));
    formData.append('name', nome);
    formData.append('description', descricao);
    formData.append('tags', JSON.stringify(tags));
    formData.append('domain', 'DIARIO_OFICIAL');
    formData.append('subdomain', 'TEXTOS_COMPLETOS');
    formData.append('document_type', 'OTHER');

    // Fazer upload
    console.log(`📤 Enviando: ${info.filename}`);
    console.log(`   📝 ${nome}`);
    console.log(`   📅 ${periodo.mes}/${periodo.ano}`);
    
    const response = await axios.post(`${API_URL}/documents/upload`, formData, {
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
    const errorMsg = error.response?.data?.message || error.message;
    const errorDetails = error.response?.data?.error || '';
    console.log(`   ❌ Erro: ${errorMsg}`);
    if (errorDetails) {
      console.log(`   📄 Detalhes: ${errorDetails}`);
    }
    console.log('');
    return false;
  }
}

/**
 * Processa todos os PDFs na pasta
 */
async function processarTodosPDFs() {
  console.log('🚀 UPLOAD AUTOMÁTICO DE DIÁRIOS OFICIAIS');
  console.log('==========================================\n');

  // 1. Autenticação
  console.log('🔐 Fazendo login...\n');
  const auth = await obterTokenAdmin();
  
  if (!auth.success || !auth.token) {
    console.log(`❌ Erro na autenticação: ${auth.error}`);
    console.log('\n💡 Configure as credenciais em auth-helper.ts');
    return;
  }

  const authToken = auth.token;
  console.log('==========================================\n');

  // 2. Listar PDFs
  const files = fs.readdirSync(DOWNLOADS_PATH)
    .filter(f => f.endsWith('.pdf') && f.startsWith('D.O.S.'));

  console.log(`📂 Encontrados ${files.length} PDFs\n`);

  if (files.length === 0) {
    console.log('❌ Nenhum PDF encontrado!');
    return;
  }

  // Extrair informações
  const pdfs: PDFInfo[] = [];
  for (const file of files) {
    const info = extrairInfoDoPDF(file);
    if (info) {
      pdfs.push(info);
    } else {
      console.log(`⚠️  Ignorando arquivo: ${file} (formato inválido)`);
    }
  }

  console.log(`✅ ${pdfs.length} PDFs válidos para processar\n`);
  console.log('==========================================\n');

  // Ordenar por edição
  pdfs.sort((a, b) => parseInt(a.edicao) - parseInt(b.edicao));

  // Processar cada PDF
  let sucessos = 0;
  let falhas = 0;

  for (let i = 0; i < pdfs.length; i++) {
    const info = pdfs[i];
    console.log(`[${i + 1}/${pdfs.length}] Processando edição ${info.edicao}...`);
    
    const sucesso = await uploadPDF(info, authToken);
    
    if (sucesso) {
      sucessos++;
    } else {
      falhas++;
    }

    // Pausa de 2 segundos entre uploads
    if (i < pdfs.length - 1) {
      console.log('⏳ Aguardando 2 segundos...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Relatório final
  console.log('==========================================');
  console.log('📊 RELATÓRIO FINAL');
  console.log('==========================================');
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Falhas: ${falhas}`);
  console.log(`📁 Total processado: ${pdfs.length}`);
  console.log('==========================================\n');

  if (falhas > 0) {
    console.log('⚠️  Alguns uploads falharam. Verifique os logs acima.');
  } else {
    console.log('🎉 Todos os uploads foram concluídos com sucesso!');
  }
}

// Executar
processarTodosPDFs().catch(console.error);
