/**
 * Script para extrair texto de um PDF do Diário Oficial
 * Para análise do conteúdo e estrutura
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const pdfPath = path.resolve(__dirname, './downloads/D.O.S._1833-8_assinado.pdf');

async function extrairTextoPDF() {
  console.log('📄 Extraindo texto do PDF...\n');
  
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log('📊 Informações do PDF:');
    console.log(`   Páginas: ${data.numpages}`);
    console.log(`   Texto total: ${data.text.length} caracteres\n`);
    
    // Mostrar primeiras 3000 caracteres para análise
    console.log('📝 Primeiros 3000 caracteres:\n');
    console.log('='.repeat(80));
    console.log(data.text.substring(0, 3000));
    console.log('='.repeat(80));
    
    // Procurar por padrões típicos
    console.log('\n🔍 Buscando padrões típicos:\n');
    
    const portarias = data.text.match(/PORTARIA\s+N[º°]?\s*\d+/gi);
    if (portarias) {
      console.log(`✅ Encontradas ${portarias.length} PORTARIAS:`);
      portarias.slice(0, 5).forEach(p => console.log(`   - ${p}`));
    }
    
    const decretos = data.text.match(/DECRETO\s+N[º°]?\s*\d+/gi);
    if (decretos) {
      console.log(`\n✅ Encontrados ${decretos.length} DECRETOS:`);
      decretos.slice(0, 5).forEach(d => console.log(`   - ${d}`));
    }
    
    const editais = data.text.match(/EDITAL\s+[Nn][º°]?\s*\d+/gi);
    if (editais) {
      console.log(`\n✅ Encontrados ${editais.length} EDITAIS:`);
      editais.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    }
    
    const leis = data.text.match(/LEI\s+N[º°]?\s*\d+/gi);
    if (leis) {
      console.log(`\n✅ Encontradas ${leis.length} LEIS:`);
      leis.slice(0, 5).forEach(l => console.log(`   - ${l}`));
    }
    
    // Procurar por seções/divisões
    console.log('\n📂 Procurando por seções/divisões:\n');
    const secoes = data.text.match(/(GABINETE|SECRETARIA\s+MUNICIPAL|SEÇÃO|DEPARTAMENTO)[^\\n]*/gi);
    if (secoes) {
      console.log(`✅ Encontradas ${secoes.length} menções a órgãos/seções:`);
      const unique = [...new Set(secoes.map(s => s.substring(0, 50)))];
      unique.slice(0, 10).forEach(s => console.log(`   - ${s}...`));
    }
    
    // Salvar texto completo em arquivo
    const outputPath = path.resolve(__dirname, './downloads/DOS_1833_texto_extraido.txt');
    fs.writeFileSync(outputPath, data.text);
    console.log(`\n💾 Texto completo salvo em: ${outputPath}`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

extrairTextoPDF();
