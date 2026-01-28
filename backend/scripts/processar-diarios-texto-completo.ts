/**
 * Script 2: Processar Diários Oficiais → TEXTOS COMPLETOS
 * 
 * Extrai texto integral de todos os atos para consultas detalhadas
 * tipo "Quero ler o decreto 3159 completo" ou "O que diz a lei?"
 * 
 * Remove: Seção de nomes de secretários (evita desatualização)
 * Mantém: Texto completo dos atos (decretos, leis, portarias)
 */

import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const DOWNLOAD_DIR = path.resolve(__dirname, './downloads');
const OUTPUT_FILE = path.resolve(__dirname, './downloads/textos-completos-diario-oficial.txt');

function removerSecaoSecretarios(texto: string): string {
  // Remove página 2 típica com lista de autoridades
  // Padrão: De "PREFEITA" até "SUMÁRIO" ou "PREFEITURA DA CIDADE"
  
  let textoLimpo = texto;
  
  // Padrão 1: Página de expediente completa
  const pattern1 = /Ano\s+[IVX]+\s*●\s*Nº\s*\d+[\s\S]*?(?=SUMÁRIO|PREFEITURA DA CIDADE|Atos da Prefeita|ATOS DA PREFEITA|AVISOS)/i;
  textoLimpo = textoLimpo.replace(pattern1, '\n');
  
  // Padrão 2: Seção específica de autoridades
  const pattern2 = /PREFEITA[\s\S]*?Controlador Geral do Município[\s\S]*?(?=SUMÁRIO|Atos da Prefeita)/i;
  textoLimpo = textoLimpo.replace(pattern2, '\n');
  
  // Padrão 3: Segunda-feira, dia mes de ano + lista
  const pattern3 = /(Segunda|Terça|Quarta|Quinta|Sexta)-feira,\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}[\s\S]*?(?=SUMÁRIO|Atos|DECRETO|PORTARIA|LEI)/i;
  textoLimpo = textoLimpo.replace(pattern3, '\n');
  
  // Padrão 4: Linhas individuais com cargos/nomes (ex: "Secretário Municipal de\nNome Completo")
  const linhasCargo = [
    'PREFEITA', 'VICE-PREFEITA', 'Prefeita', 'Vice-Prefeita',
    'Secretário Municipal', 'Secretária Municipal',
    'Presidente do Instituto', 'Controlador Geral', 'Procurador Geral'
  ];
  
  for (const cargo of linhasCargo) {
    // Remove linha do cargo + próxima linha (nome)
    const regexCargo = new RegExp(`${cargo}[^\\n]*\\n[^\\n]*`, 'gi');
    textoLimpo = textoLimpo.replace(regexCargo, '');
  }
  
  return textoLimpo;
}

function limparTextoDiario(texto: string): string {
  let textoLimpo = texto;
  
  // 1. Remover seção de secretários
  textoLimpo = removerSecaoSecretarios(textoLimpo);
  
  // 2. Remover cabeçalhos repetitivos
  textoLimpo = textoLimpo.replace(/Diário Oficial do Município de Saquarema[\s\S]*?de\s+\d{4}/gi, '');
  
  // 3. Remover footers de página
  textoLimpo = textoLimpo.replace(/Ano\s+[IVX]+\s*●\s*Nº\s*\d+/gi, '');
  
  // 4. Remover informações de contato repetitivas
  textoLimpo = textoLimpo.replace(/Expedido pela Secretaria Municipal[\s\S]*?CEP:[\s\S]*?\d{5}-\d{3}/gi, '');
  textoLimpo = textoLimpo.replace(/Jornalistas:[\s\S]*?Acesse também:[\s\S]*?saquarema\.rj\.gov\.br/gi, '');
  
  // 5. Normalizar espaços
  textoLimpo = textoLimpo.replace(/\n{3,}/g, '\n\n');
  textoLimpo = textoLimpo.replace(/[ \t]+/g, ' ');
  
  return textoLimpo.trim();
}

function extrairSecoes(texto: string): { titulo: string; conteudo: string }[] {
  const secoes: { titulo: string; conteudo: string }[] = [];
  
  // Identificar seções principais
  const padroes = [
    /ATOS DA PREFEITA/i,
    /AVISOS,?\s*ATAS,?\s*EXTRATOS/i,
    /DECRETO\s+N[º°]?\s*\d+/i,
    /PORTARIA\s+N[º°]?\s*\d+/i,
    /LEI\s+N[º°]?\s*\d+/i,
    /EXTRATO\s+DO\s+CONTRATO/i,
    /EXTRATO\s+DA\s+ATA/i,
  ];
  
  let posicaoAtual = 0;
  const matches: { titulo: string; posicao: number }[] = [];
  
  for (const padrao of padroes) {
    const regex = new RegExp(padrao, 'gi');
    let match;
    
    while ((match = regex.exec(texto)) !== null) {
      matches.push({
        titulo: match[0],
        posicao: match.index
      });
    }
  }
  
  // Ordenar por posição
  matches.sort((a, b) => a.posicao - b.posicao);
  
  // Extrair conteúdo entre matches
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].posicao;
    const fim = i < matches.length - 1 ? matches[i + 1].posicao : texto.length;
    
    const conteudo = texto.substring(inicio, fim).trim();
    
    if (conteudo.length > 50) { // Ignorar seções muito pequenas
      secoes.push({
        titulo: matches[i].titulo,
        conteudo
      });
    }
  }
  
  return secoes;
}

async function processarTodosDiarios() {
  console.log('📄 Processando Diários Oficiais → TEXTOS COMPLETOS\n');
  
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('_assinado.pdf'))
      .sort();
    
    console.log(`📄 ${files.length} PDFs encontrados\n`);
    
    const conteudoCompleto: string[] = [];
    let totalCaracteres = 0;
    
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.join(DOWNLOAD_DIR, filename);
      
      const match = filename.match(/D\.O\.S\._(\d+)-(\d+)_assinado\.pdf/);
      const edicao = match ? match[1] : 'desconhecido';
      const anoEdicao = match ? match[2] : 'desconhecido';
      
      console.log(`⚙️  [${i + 1}/${files.length}] Processando: Edição ${edicao}/${anoEdicao}`);
      
      try {
        const dataBuffer = fs.readFileSync(filepath);
        const data = await pdf(dataBuffer);
        
        // Limpar texto
        const textoLimpo = limparTextoDiario(data.text);
        
        // Criar marcador de edição
        const separador = '='.repeat(80);
        const cabecalho = `\n${separador}\nEDIÇÃO ${edicao}/${anoEdicao}\n${separador}\n`;
        
        conteudoCompleto.push(cabecalho);
        conteudoCompleto.push(textoLimpo);
        conteudoCompleto.push('\n');
        
        totalCaracteres += textoLimpo.length;
        
        console.log(`   ✅ ${textoLimpo.length.toLocaleString()} caracteres extraídos`);
      } catch (error: any) {
        console.error(`   ❌ Erro: ${error.message}`);
      }
    }
    
    // Salvar arquivo
    const textoFinal = conteudoCompleto.join('\n');
    fs.writeFileSync(OUTPUT_FILE, textoFinal, 'utf-8');
    
    console.log(`\n✅ Arquivo gerado com sucesso!`);
    console.log(`📁 ${OUTPUT_FILE}`);
    console.log(`📊 Total de caracteres: ${totalCaracteres.toLocaleString()}`);
    console.log(`📄 ${files.length} edições processadas`);
    console.log(`💾 Tamanho do arquivo: ${(textoFinal.length / 1024).toFixed(2)} KB`);
    
    // Estimativa de chunks
    const chunkSize = 800; // Tamanho médio de chunk
    const estimativaChunks = Math.ceil(totalCaracteres / chunkSize);
    console.log(`📦 Estimativa de chunks: ~${estimativaChunks}`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

processarTodosDiarios();
