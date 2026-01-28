/**
 * Script para baixar todos os Diários Oficiais de Saquarema
 * da página principal do DOS
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const DOS_URL = 'https://dos.saquarema.rj.gov.br/';
const DOWNLOAD_DIR = path.resolve(__dirname, './downloads');

interface DiarioOficial {
  numero: string;
  ano: string;
  data: string;
  url: string;
  filename: string;
}

async function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadFile(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    client.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

function extractDiarios(html: string): DiarioOficial[] {
  const diarios: DiarioOficial[] = [];
  const seen = new Set<string>();
  
  // Pattern 1: Links diretos para PDFs
  const regex1 = /href="(https?:\/\/dos\.saquarema\.rj\.gov\.br\/wp-content\/uploads\/[^"]*\/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf)"/gi;
  
  let match;
  while ((match = regex1.exec(html)) !== null) {
    const url = match[1];
    const numero = match[2];
    const ano = match[3];
    const filename = `D.O.S._${numero}-${ano}_assinado.pdf`;
    
    if (!seen.has(filename)) {
      seen.add(filename);
      diarios.push({
        numero,
        ano,
        data: '',
        url,
        filename
      });
    }
  }
  
  // Pattern 2: URLs relativas ou outros formatos
  const regex2 = /\/wp-content\/uploads\/\d{4}\/\d{2}\/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf/gi;
  
  while ((match = regex2.exec(html)) !== null) {
    const numero = match[1];
    const ano = match[2];
    const filename = `D.O.S._${numero}-${ano}_assinado.pdf`;
    
    if (!seen.has(filename)) {
      seen.add(filename);
      
      // Reconstruir URL completa
      const url = `https://dos.saquarema.rj.gov.br${match[0]}`;
      
      diarios.push({
        numero,
        ano,
        data: '',
        url,
        filename
      });
    }
  }
  
  return diarios;
}

async function baixarTodosDiarios() {
  console.log('🌐 Buscando lista de Diários Oficiais...\n');
  
  try {
    // Criar diretório de downloads se não existir
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }
    
    // Buscar HTML da página
    const html = await fetchHTML(DOS_URL);
    
    // Extrair lista de diários
    const diarios = extractDiarios(html);
    
    console.log(`📋 Encontrados ${diarios.length} Diários Oficiais\n`);
    
    if (diarios.length === 0) {
      console.log('⚠️  Nenhum diário encontrado. Verifique o padrão de extração.');
      return;
    }
    
    // Exibir lista
    console.log('📄 Lista de Diários:');
    diarios.forEach((d, i) => {
      console.log(`   ${i + 1}. Edição ${d.numero}/${d.ano} - ${d.filename}`);
    });
    console.log('\n');
    
    // Baixar todos
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < diarios.length; i++) {
      const diario = diarios[i];
      const filepath = path.join(DOWNLOAD_DIR, diario.filename);
      
      // Verificar se já existe
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  [${i + 1}/${diarios.length}] Já existe: ${diario.filename}`);
        skipped++;
        continue;
      }
      
      try {
        console.log(`⬇️  [${i + 1}/${diarios.length}] Baixando: ${diario.filename}`);
        await downloadFile(diario.url, filepath);
        console.log(`   ✅ Salvo em: ${filepath}`);
        downloaded++;
        
        // Delay entre downloads para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ❌ Erro ao baixar ${diario.filename}: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n📊 Resumo:');
    console.log(`   ✅ Baixados: ${downloaded}`);
    console.log(`   ⏭️  Já existiam: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📁 Total de arquivos: ${downloaded + skipped}`);
    
    // Salvar lista em JSON para referência
    const listPath = path.join(DOWNLOAD_DIR, 'lista-diarios.json');
    fs.writeFileSync(listPath, JSON.stringify(diarios, null, 2));
    console.log(`\n💾 Lista salva em: ${listPath}`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

baixarTodosDiarios();
