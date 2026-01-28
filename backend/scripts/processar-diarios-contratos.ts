/**
 * Script 3: Processar Diários Oficiais → CONTRATOS E LICITAÇÕES
 * 
 * Extrai informações estruturadas de contratos, licitações e valores
 * tipo "Qual o valor do contrato 006/2026?" ou "Quem venceu a licitação?"
 * 
 * Remove: Nomes de servidores designados como fiscais (já está em RH)
 * Mantém: Número contrato, empresa, objeto, valor
 */

import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const DOWNLOAD_DIR = path.resolve(__dirname, './downloads');
const OUTPUT_FILE = path.resolve(__dirname, './downloads/contratos-licitacoes-diario-oficial.csv');

interface Contrato {
  tipo: string;
  numero: string;
  ano: string;
  edicao: string;
  anoEdicao: string;
  contratante: string;
  contratada: string;
  cnpj: string;
  objeto: string;
  valor: string;
}

function extrairContratos(texto: string, edicao: string, anoEdicao: string): Contrato[] {
  const contratos: Contrato[] = [];
  
  // Padrão: EXTRATO DO CONTRATO N° 006/2026
  const regexContrato = /EXTRATO\s+DO\s+CONTRATO\s*N[º°]?\s*(\d+)\/(\d{4})([\s\S]*?)(?=EXTRATO|PORTARIA|DECRETO|LEI|Saquarema,|$)/gi;
  
  let match;
  while ((match = regexContrato.exec(texto)) !== null) {
    const numero = match[1];
    const ano = match[2];
    const conteudo = match[3];
    
    // Extrair informações do conteúdo
    const contratanteMatch = conteudo.match(/Contratante:\s*([^\n]+)/i);
    const contratadaMatch = conteudo.match(/Contratad[ao]:\s*([^\n,]+)/i);
    const cnpjMatch = conteudo.match(/CNPJ\s*n?[º°]?\s*([\d.\/\-]+)/i);
    const objetoMatch = conteudo.match(/Objeto:\s*([^\n]+(?:\n(?!Prazo|Valor|Dotação)[^\n]+)*)/i);
    const valorMatch = conteudo.match(/Valor\s+Total\s+do\s+Contrato:\s*R\$\s*([\d.,]+)/i);
    
    const contrato: Contrato = {
      tipo: 'CONTRATO',
      numero,
      ano,
      edicao,
      anoEdicao,
      contratante: contratanteMatch ? contratanteMatch[1].trim() : 'Município de Saquarema',
      contratada: contratadaMatch ? contratadaMatch[1].trim() : 'Não identificada',
      cnpj: cnpjMatch ? cnpjMatch[1].trim() : '',
      objeto: objetoMatch ? limparTexto(objetoMatch[1]) : 'Não especificado',
      valor: valorMatch ? limparValor(valorMatch[1]) : '0.00'
    };
    
    contratos.push(contrato);
  }
  
  // Padrão: EXTRATO DA ATA DE REGISTRO DE PREÇOS Nº 006/2026
  const regexAta = /EXTRATO\s+DA\s+ATA\s+DE\s+REGISTRO\s+DE\s+PRE[ÇC]OS?\s*N[º°]?\s*(\d+)\/(\d{4})([\s\S]*?)(?=EXTRATO|PORTARIA|DECRETO|Saquarema,|$)/gi;
  
  while ((match = regexAta.exec(texto)) !== null) {
    const numero = match[1];
    const ano = match[2];
    const conteudo = match[3];
    
    const objetoMatch = conteudo.match(/Objeto:\s*([^\n]+(?:\n(?!Valor)[^\n]+)*)/i);
    const valorMatch = conteudo.match(/Valor\s+Total:\s*R\$\s*([\d.,]+)/i);
    
    const contrato: Contrato = {
      tipo: 'ATA_REGISTRO_PRECOS',
      numero,
      ano,
      edicao,
      anoEdicao,
      contratante: 'Município de Saquarema',
      contratada: 'Registro de Preços',
      cnpj: '',
      objeto: objetoMatch ? limparTexto(objetoMatch[1]) : 'Não especificado',
      valor: valorMatch ? limparValor(valorMatch[1]) : '0.00'
    };
    
    contratos.push(contrato);
  }
  
  // Padrão: EXTRATO DO TERMO ADITIVO ou EXTRATO DO 10º TERMO ADITIVO
  const regexAditivo = /EXTRATO\s+DO\s+(\d+[º°]?\s+)?TERMO\s+ADITIVO[^N]*?(?:DO\s+)?CONTRATO\s*N[º°]?\s*(\d+)\/(\d{4})([\s\S]*?)(?=EXTRATO|PORTARIA|DECRETO|Saquarema,|$)/gi;
  
  while ((match = regexAditivo.exec(texto)) !== null) {
    const termoNumero = match[1] ? match[1].replace(/[º°\s]/g, '') : '1';
    const numeroContrato = match[2];
    const anoContrato = match[3];
    const conteudo = match[4];
    
    const contratadaMatch = conteudo.match(/Contratad[ao]:\s*([^\n,]+)/i);
    const cnpjMatch = conteudo.match(/CNPJ\s*n?[º°]?\s*([\d.\/\-]+)/i);
    const objetoMatch = conteudo.match(/(?:Objeto|Repactuação):\s*([^\n]+)/i);
    const valorMatch = conteudo.match(/(?:Valor|Repactuação).*?R\$\s*([\d.,]+)/i);
    
    const contrato: Contrato = {
      tipo: 'TERMO_ADITIVO',
      numero: `${numeroContrato} (Aditivo ${termoNumero})`,
      ano: anoContrato,
      edicao,
      anoEdicao,
      contratante: 'Município de Saquarema',
      contratada: contratadaMatch ? contratadaMatch[1].trim() : 'Não identificada',
      cnpj: cnpjMatch ? cnpjMatch[1].trim() : '',
      objeto: objetoMatch ? limparTexto(objetoMatch[1]) : `Aditivo ao contrato ${numeroContrato}/${anoContrato}`,
      valor: valorMatch ? limparValor(valorMatch[1]) : '0.00'
    };
    
    contratos.push(contrato);
  }
  
  return contratos;
}

function limparTexto(texto: string): string {
  return texto
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Limitar tamanho
}

function limparValor(valor: string): string {
  // Remove pontos de milhar, substitui vírgula por ponto
  return valor
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();
}

function removerNomesServidores(texto: string): string {
  // Remove seção "EXTRATO DO TERMO DE DESIGNAÇÃO" (contém nomes de fiscais)
  texto = texto.replace(/EXTRATO\s+DO\s+TERMO\s+DE\s+DESIGNA[ÇC][ÃA]O[\s\S]*?(?=EXTRATO|PORTARIA|DECRETO|$)/gi, '');
  
  return texto;
}

async function processarTodosDiarios() {
  console.log('💼 Processando Diários Oficiais → CONTRATOS E LICITAÇÕES\n');
  
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('_assinado.pdf'))
      .sort();
    
    console.log(`📄 ${files.length} PDFs encontrados\n`);
    
    const todosContratos: Contrato[] = [];
    
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
        
        // Remover nomes de servidores designados
        const textoLimpo = removerNomesServidores(data.text);
        
        // Extrair contratos
        const contratos = extrairContratos(textoLimpo, edicao, anoEdicao);
        todosContratos.push(...contratos);
        
        console.log(`   ✅ ${contratos.length} contratos/atas encontrados`);
      } catch (error: any) {
        console.error(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total de documentos contratuais: ${todosContratos.length}`);
    
    // Gerar CSV
    const csvLines = ['Tipo,Numero,Ano,Edicao,Ano_Edicao,Contratante,Contratada,CNPJ,Objeto,Valor'];
    
    for (const contrato of todosContratos) {
      const objetoEscapado = `"${contrato.objeto.replace(/"/g, '""')}"`;
      const contratadaEscapada = `"${contrato.contratada.replace(/"/g, '""')}"`;
      
      csvLines.push(
        `${contrato.tipo},${contrato.numero},${contrato.ano},${contrato.edicao},${contrato.anoEdicao},` +
        `${contrato.contratante},${contratadaEscapada},${contrato.cnpj},${objetoEscapado},${contrato.valor}`
      );
    }
    
    fs.writeFileSync(OUTPUT_FILE, csvLines.join('\n'), 'utf-8');
    
    console.log(`\n✅ Arquivo gerado com sucesso!`);
    console.log(`📁 ${OUTPUT_FILE}`);
    console.log(`📊 ${todosContratos.length} documentos indexados`);
    
    // Estatísticas
    const porTipo = todosContratos.reduce((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    console.log('\n📈 Distribuição por tipo:');
    Object.entries(porTipo).forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });
    
    // Calcular valor total
    const valorTotal = todosContratos.reduce((sum, c) => {
      const valor = parseFloat(c.valor) || 0;
      return sum + valor;
    }, 0);
    
    console.log(`\n💰 Valor total dos contratos: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

processarTodosDiarios();
