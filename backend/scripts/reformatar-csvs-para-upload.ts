/**
 * REFORMATAR CSVs PARA UPLOAD
 * 
 * Converte os CSVs em formato de texto verboso para evitar chunks muito pequenos.
 * Cada linha do CSV vira um parágrafo completo com todas as informações.
 */

import * as fs from 'fs';
import * as path from 'path';

// ========================================
// REFORMATAR ÍNDICE DE ATOS
// ========================================
function reformatarIndiceAtos() {
  console.log('\n📋 REFORMATANDO: Índice de Atos');
  console.log('='.repeat(60));
  
  const inputPath = path.join(__dirname, 'downloads', 'indice-atos-diario-oficial.csv');
  const outputPath = path.join(__dirname, 'downloads', 'indice-atos-diario-oficial-formatado.txt');
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  let output = '# ÍNDICE DE ATOS DO DIÁRIO OFICIAL DE SAQUAREMA\n';
  output += '# Edições 1784 a 1833 (Ano 7-8, dezembro 2025 - janeiro 2026)\n';
  output += '# Total: 185 atos administrativos indexados\n\n';
  
  // Pular cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 7) continue;
    
    const tipo = parts[0]?.trim() || '';
    const numero = parts[1]?.trim() || '';
    const ano = parts[2]?.trim() || '';
    const edicao = parts[3]?.trim() || '';
    const anoEdicao = parts[4]?.trim() || '';
    const dataPublicacao = parts[5]?.trim() || '';
    const assunto = parts.slice(6).join(',').trim().replace(/^"|"$/g, '') || 'Sem assunto especificado';
    
    if (!tipo || !numero) continue;
    
    // Formato verboso: cada ato como parágrafo completo
    output += `${tipo} Nº ${numero}/${ano} - Publicado no Diário Oficial de Saquarema, Edição ${edicao}/${anoEdicao}`;
    if (dataPublicacao) {
      output += `, em ${dataPublicacao}`;
    }
    output += `. Assunto: ${assunto}`;
    output += `\n\n`;
  }
  
  fs.writeFileSync(outputPath, output, 'utf-8');
  
  const stats = fs.statSync(outputPath);
  console.log(`✅ Arquivo reformatado gerado!`);
  console.log(`📁 ${outputPath}`);
  console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📝 Caracteres: ${output.length.toLocaleString()}`);
  
  return outputPath;
}

// ========================================
// REFORMATAR CONTRATOS E LICITAÇÕES
// ========================================
function reformatarContratos() {
  console.log('\n💼 REFORMATANDO: Contratos e Licitações');
  console.log('='.repeat(60));
  
  const inputPath = path.join(__dirname, 'downloads', 'contratos-licitacoes-diario-oficial.csv');
  const outputPath = path.join(__dirname, 'downloads', 'contratos-licitacoes-diario-oficial-formatado.txt');
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  let output = '# CONTRATOS E LICITAÇÕES DO DIÁRIO OFICIAL DE SAQUAREMA\n';
  output += '# Edições 1784 a 1833 (Ano 7-8, dezembro 2025 - janeiro 2026)\n';
  output += '# Total: 233 contratos, atas e termos aditivos (R$ 292.727.548,73)\n\n';
  
  let totalValor = 0;
  
  // Pular cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 10) continue;
    
    const tipo = parts[0]?.trim() || '';
    const numero = parts[1]?.trim() || '';
    const ano = parts[2]?.trim() || '';
    const edicao = parts[3]?.trim() || '';
    const anoEdicao = parts[4]?.trim() || '';
    const contratante = parts[5]?.trim() || 'Não identificado';
    const contratada = parts[6]?.trim() || 'Não identificada';
    const cnpj = parts[7]?.trim() || 'Não informado';
    const objeto = parts[8]?.trim().replace(/^"|"$/g, '') || 'Não especificado';
    const valorStr = parts[9]?.trim() || '0';
    
    if (!tipo || !numero) continue;
    
    // Converter valor
    const valor = parseFloat(valorStr.replace(/[^0-9.]/g, '')) || 0;
    totalValor += valor;
    
    // Formato verboso: cada contrato como parágrafo completo
    let tipoNome = tipo;
    if (tipo === 'CONTRATO') tipoNome = 'Contrato';
    if (tipo === 'ATA_REGISTRO_PRECOS') tipoNome = 'Ata de Registro de Preços';
    if (tipo === 'TERMO_ADITIVO') tipoNome = 'Termo Aditivo';
    
    output += `${tipoNome} Nº ${numero}/${ano} - `;
    output += `Publicado no Diário Oficial, Edição ${edicao}/${anoEdicao}. `;
    output += `Contratante: ${contratante}. `;
    output += `Contratada: ${contratada}`;
    if (cnpj && cnpj !== 'Não informado') {
      output += ` (CNPJ: ${cnpj})`;
    }
    output += `. Objeto: ${objeto}. `;
    if (valor > 0) {
      output += `Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    }
    output += `\n\n`;
  }
  
  fs.writeFileSync(outputPath, output, 'utf-8');
  
  const stats = fs.statSync(outputPath);
  console.log(`✅ Arquivo reformatado gerado!`);
  console.log(`📁 ${outputPath}`);
  console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📝 Caracteres: ${output.length.toLocaleString()}`);
  console.log(`💰 Valor total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  
  return outputPath;
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.log('🔄 REFORMATANDO ARQUIVOS CSV PARA UPLOAD');
  console.log('Convertendo para formato verboso (evita chunks pequenos)');
  console.log('');
  
  try {
    const indiceFormatado = reformatarIndiceAtos();
    const contratosFormatado = reformatarContratos();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ REFORMATAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📂 ARQUIVOS PRONTOS PARA UPLOAD:');
    console.log('');
    console.log('1️⃣ ÍNDICE DE ATOS (reformatado):');
    console.log(`   📄 ${path.basename(indiceFormatado)}`);
    console.log('   📁 Domínio: Diário Oficial');
    console.log('   📂 Subdomain: Índice de Atos');
    console.log('');
    console.log('2️⃣ TEXTOS COMPLETOS (já estava OK):');
    console.log('   📄 textos-completos-diario-oficial.txt');
    console.log('   📁 Domínio: Diário Oficial');
    console.log('   📂 Subdomain: Textos Completos');
    console.log('');
    console.log('3️⃣ CONTRATOS E LICITAÇÕES (reformatado):');
    console.log(`   📄 ${path.basename(contratosFormatado)}`);
    console.log('   📁 Domínio: Diário Oficial');
    console.log('   📂 Subdomain: Contratos e Licitações');
    console.log('');
    console.log('⚠️  IMPORTANTE: Use os arquivos "-formatado.txt" no upload!');
    console.log('   Formato verboso evita chunks muito pequenos.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro na reformatação:', error);
    process.exit(1);
  }
}

main();
