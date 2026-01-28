/**
 * Script 1: Processar Diários Oficiais → ÍNDICE DE ATOS
 * 
 * Gera CSV com índice rápido de todos os atos (decretos, leis, portarias, editais)
 * para buscas tipo "Decreto 3159" ou "Qual o número da portaria?"
 * 
 * Remove: Nomes de secretários (evita desatualização, já está em RH/MATRICULAS)
 */

import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const DOWNLOAD_DIR = path.resolve(__dirname, './downloads');
const OUTPUT_FILE = path.resolve(__dirname, './downloads/indice-atos-diario-oficial.csv');

interface Ato {
  tipo: string;
  numero: string;
  ano: string;
  edicao: string;
  anoEdicao: string;
  dataPublicacao: string;
  assunto: string;
}

function extrairAtos(texto: string, edicao: string, anoEdicao: string): Ato[] {
  const atos: Ato[] = [];
  
  // 1. DECRETOS: DECRETO Nº 3.159, DE 16 DE JANEIRO DE 2026
  const regexDecreto = /DECRETO\s+N[º°]?\s*(\d+)[,\s]+DE\s+(\d{1,2})\s+DE\s+(\w+)\s+DE\s+(\d{4})/gi;
  let match;
  
  while ((match = regexDecreto.exec(texto)) !== null) {
    const numero = match[1];
    const dia = match[2].padStart(2, '0');
    const mes = match[3];
    const ano = match[4];
    const dataPublicacao = `${ano}-${converterMes(mes)}-${dia}`;
    
    // Extrair assunto (próximas 100 chars após o decreto)
    const posicao = match.index + match[0].length;
    const contexto = texto.substring(posicao, posicao + 200);
    const assunto = extrairAssunto(contexto);
    
    atos.push({
      tipo: 'DECRETO',
      numero,
      ano,
      edicao,
      anoEdicao,
      dataPublicacao,
      assunto
    });
  }
  
  // 2. PORTARIAS: PORTARIA Nº 38, DE 19 DE JANEIRO DE 2026
  const regexPortaria = /PORTARIA\s+N[º°]?\s*(\d+)[,\s]+DE\s+(\d{1,2})\s+DE\s+(\w+)\s+DE\s+(\d{4})/gi;
  
  while ((match = regexPortaria.exec(texto)) !== null) {
    const numero = match[1];
    const dia = match[2].padStart(2, '0');
    const mes = match[3];
    const ano = match[4];
    const dataPublicacao = `${ano}-${converterMes(mes)}-${dia}`;
    
    const posicao = match.index + match[0].length;
    const contexto = texto.substring(posicao, posicao + 200);
    const assunto = extrairAssunto(contexto);
    
    atos.push({
      tipo: 'PORTARIA',
      numero,
      ano,
      edicao,
      anoEdicao,
      dataPublicacao,
      assunto
    });
  }
  
  // 3. LEIS: LEI Nº 1234, DE 10 DE JANEIRO DE 2026
  const regexLei = /LEI\s+N[º°]?\s*(\d+)[,\s]+DE\s+(\d{1,2})\s+DE\s+(\w+)\s+DE\s+(\d{4})/gi;
  
  while ((match = regexLei.exec(texto)) !== null) {
    const numero = match[1];
    const dia = match[2].padStart(2, '0');
    const mes = match[3];
    const ano = match[4];
    const dataPublicacao = `${ano}-${converterMes(mes)}-${dia}`;
    
    const posicao = match.index + match[0].length;
    const contexto = texto.substring(posicao, posicao + 200);
    const assunto = extrairAssunto(contexto);
    
    atos.push({
      tipo: 'LEI',
      numero,
      ano,
      edicao,
      anoEdicao,
      dataPublicacao,
      assunto
    });
  }
  
  // 4. EDITAIS: EDITAL Nº 005/2026
  const regexEdital = /EDITAL\s+N[º°]?\s*(\d+)\/(\d{4})/gi;
  
  while ((match = regexEdital.exec(texto)) !== null) {
    const numero = match[1];
    const ano = match[2];
    
    const posicao = match.index + match[0].length;
    const contexto = texto.substring(posicao, posicao + 200);
    const assunto = extrairAssunto(contexto);
    
    atos.push({
      tipo: 'EDITAL',
      numero,
      ano,
      edicao,
      anoEdicao,
      dataPublicacao: '', // Editais nem sempre têm data clara
      assunto
    });
  }
  
  return atos;
}

function converterMes(mes: string): string {
  const meses: { [key: string]: string } = {
    'janeiro': '01', 'january': '01',
    'fevereiro': '02', 'february': '02',
    'março': '03', 'march': '03',
    'abril': '04', 'april': '04',
    'maio': '05', 'may': '05',
    'junho': '06', 'june': '06',
    'julho': '07', 'july': '07',
    'agosto': '08', 'august': '08',
    'setembro': '09', 'september': '09',
    'outubro': '10', 'october': '10',
    'novembro': '11', 'november': '11',
    'dezembro': '12', 'december': '12'
  };
  
  return meses[mes.toLowerCase()] || '01';
}

function extrairAssunto(contexto: string): string {
  // Pegar primeira linha após o cabeçalho (geralmente é o assunto)
  const linhas = contexto.split('\n').filter(l => l.trim().length > 10);
  
  if (linhas.length > 0) {
    let assunto = linhas[0].trim();
    
    // Limpar caracteres especiais
    assunto = assunto.replace(/[\r\n]+/g, ' ');
    assunto = assunto.replace(/\s+/g, ' ');
    
    // Limitar tamanho
    if (assunto.length > 150) {
      assunto = assunto.substring(0, 147) + '...';
    }
    
    return assunto;
  }
  
  return 'Sem assunto identificado';
}

function removerSecaoSecretarios(texto: string): string {
  // Remove a seção completa de lista de secretários
  // Padrão: "PREFEITA\nNome\nVICE-PREFEITA\nNome\n..." até antes de "SUMÁRIO" ou "ATOS"
  
  const patterns = [
    // Padrão 1: De PREFEITA até SUMÁRIO
    /PREFEITA[\s\S]*?(?=SUMÁRIO|PREFEITURA DA CIDADE|Atos da Prefeita)/i,
    // Padrão 2: Ano VIII ● Nº 1833 + lista de autoridades
    /Ano\s+[IVX]+\s*●\s*Nº\s*\d+[\s\S]*?(?=SUMÁRIO|PREFEITURA DA CIDADE|Atos da Prefeita)/i,
  ];
  
  let textoLimpo = texto;
  
  for (const pattern of patterns) {
    textoLimpo = textoLimpo.replace(pattern, '');
  }
  
  return textoLimpo;
}

async function processarTodosDiarios() {
  console.log('📋 Processando Diários Oficiais → ÍNDICE DE ATOS\n');
  
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('_assinado.pdf'))
      .sort();
    
    console.log(`📄 ${files.length} PDFs encontrados\n`);
    
    const todosAtos: Ato[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.join(DOWNLOAD_DIR, filename);
      
      const match = filename.match(/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf/);
      const edicao = match ? match[1] : 'desconhecido';
      const anoEdicao = match ? match[2] : 'desconhecido';
      
      console.log(`⚙️  [${i + 1}/${files.length}] Processando: ${filename}`);
      
      try {
        const dataBuffer = fs.readFileSync(filepath);
        const data = await pdf(dataBuffer);
        
        // Remover seção de secretários
        const textoLimpo = removerSecaoSecretarios(data.text);
        
        // Extrair atos
        const atos = extrairAtos(textoLimpo, edicao, anoEdicao);
        todosAtos.push(...atos);
        
        console.log(`   ✅ ${atos.length} atos encontrados`);
      } catch (error: any) {
        console.error(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total de atos extraídos: ${todosAtos.length}`);
    
    // Gerar CSV
    const csvLines = ['Tipo,Numero,Ano,Edicao,Ano_Edicao,Data_Publicacao,Assunto'];
    
    for (const ato of todosAtos) {
      const assuntoEscapado = `"${ato.assunto.replace(/"/g, '""')}"`;
      csvLines.push(
        `${ato.tipo},${ato.numero},${ato.ano},${ato.edicao},${ato.anoEdicao},${ato.dataPublicacao},${assuntoEscapado}`
      );
    }
    
    fs.writeFileSync(OUTPUT_FILE, csvLines.join('\n'), 'utf-8');
    
    console.log(`\n✅ Arquivo gerado com sucesso!`);
    console.log(`📁 ${OUTPUT_FILE}`);
    console.log(`📊 ${todosAtos.length} atos indexados`);
    
    // Estatísticas
    const porTipo = todosAtos.reduce((acc, ato) => {
      acc[ato.tipo] = (acc[ato.tipo] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    console.log('\n📈 Distribuição por tipo:');
    Object.entries(porTipo).forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

processarTodosDiarios();
