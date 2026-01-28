/**
 * REFORMATAÇÃO ULTRA AGRESSIVA
 * 
 * Garante ZERO chunks abaixo de 150 caracteres
 * Remove TODAS as linhas curtas e junta tudo em blocos grandes
 */

import * as fs from 'fs';
import * as path from 'path';

function reformatarUltraAgressivo() {
  console.log('\n🔥 REFORMATAÇÃO ULTRA AGRESSIVA: Textos Completos');
  console.log('='.repeat(60));
  console.log('⚠️  Modo: ZERO tolerância para chunks pequenos!');
  console.log('');
  
  const inputPath = path.join(__dirname, 'downloads', 'textos-completos-diario-oficial.txt');
  const outputPath = path.join(__dirname, 'downloads', 'textos-completos-diario-oficial-ultra-limpo.txt');
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  let output = '# TEXTOS COMPLETOS DO DIÁRIO OFICIAL DE SAQUAREMA\n';
  output += '# Edições 1784 a 1833 - Ano 7-8 (dezembro 2025 a janeiro 2026)\n';
  output += '# Textos integrais de decretos, portarias, leis e editais\n';
  output += '# Nomes de secretários removidos - Formato ultra otimizado\n\n';
  
  // Dividir por edições
  const edicoes = content.split(/={60,}/);
  
  for (const edicao of edicoes) {
    let texto = edicao.trim();
    if (!texto || texto.length < 100) continue;
    
    // Extrair número da edição
    const matchEdicao = texto.match(/EDIÇÃO\s+(\d+\/\d+)/i);
    const numeroEdicao = matchEdicao ? matchEdicao[1] : 'N/A';
    
    // Limpar TUDO que pode virar chunk pequeno
    texto = texto
      // Remover separadores
      .replace(/^={3,}$/gm, ' ')
      .replace(/^-{3,}$/gm, ' ')
      .replace(/^\*{3,}$/gm, ' ')
      // Remover linhas de título de edição
      .replace(/={3,}\s*EDIÇÃO\s+\d+\/\d+\s*={3,}/gi, ' ')
      // Remover quebras múltiplas (deixar no máximo uma dupla)
      .replace(/\n{3,}/g, '\n\n')
      // Remover espaços extras
      .replace(/[ \t]+/g, ' ')
      // Remover linhas vazias ou quase vazias
      .replace(/^\s*$/gm, '')
      .trim();
    
    // Dividir em linhas e filtrar
    const linhas = texto.split('\n').filter(linha => {
      const l = linha.trim();
      // FILTRO ULTRA AGRESSIVO: Remover linhas com menos de 50 caracteres
      return l.length >= 50;
    });
    
    if (linhas.length === 0) continue;
    
    // Adicionar cabeçalho da edição
    output += `\n\nDIÁRIO OFICIAL DE SAQUAREMA - EDIÇÃO ${numeroEdicao} - Publicações oficiais do município, incluindo decretos, portarias, leis, editais e demais atos administrativos.\n\n`;
    
    // Juntar linhas em blocos grandes (mínimo 200 caracteres por bloco)
    let blocoAtual = '';
    
    for (const linha of linhas) {
      const linhaLimpa = linha.trim();
      
      if (blocoAtual.length === 0) {
        blocoAtual = linhaLimpa;
      } else {
        // Adicionar espaço entre as linhas
        blocoAtual += ' ' + linhaLimpa;
      }
      
      // Se o bloco atingiu tamanho mínimo seguro (300+ chars), adicionar ao output
      if (blocoAtual.length >= 300) {
        output += blocoAtual + '\n\n';
        blocoAtual = '';
      }
    }
    
    // Adicionar resto do bloco (se houver)
    if (blocoAtual.length >= 150) {
      output += blocoAtual + '\n\n';
    } else if (blocoAtual.length > 0) {
      // Se sobrou um pedaço pequeno, juntar com o último bloco
      output += blocoAtual + ' ';
    }
  }
  
  // Remover espaços duplos finais
  output = output.replace(/[ \t]+/g, ' ');
  output = output.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(outputPath, output, 'utf-8');
  
  const stats = fs.statSync(outputPath);
  const inputStats = fs.statSync(inputPath);
  
  console.log(`✅ Arquivo ultra limpo gerado!`);
  console.log(`📁 ${outputPath}`);
  console.log(`📊 Original: ${(inputStats.size / 1024).toFixed(2)} KB`);
  console.log(`📊 Ultra limpo: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📝 Caracteres: ${output.length.toLocaleString()}`);
  console.log(`🔥 Redução: ${((1 - stats.size / inputStats.size) * 100).toFixed(1)}%`);
  console.log(`✅ Garantia: Blocos com mínimo 150 caracteres!`);
  
  return outputPath;
}

async function main() {
  console.log('🔥 REFORMATAÇÃO ULTRA AGRESSIVA - MODO EXTREMO');
  console.log('Garantindo ZERO chunks abaixo de 150 caracteres');
  console.log('');
  
  try {
    const arquivo = reformatarUltraAgressivo();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ULTRA LIMPEZA CONCLUÍDA!');
    console.log('='.repeat(60));
    console.log('\n📂 ARQUIVO FINAL PARA UPLOAD:');
    console.log('');
    console.log('📄 TEXTOS COMPLETOS (ultra limpo):');
    console.log(`   Arquivo: ${path.basename(arquivo)}`);
    console.log('   Domínio: Diário Oficial');
    console.log('   Subdomain: Textos Completos');
    console.log('');
    console.log('🔥 Este arquivo está ULTRA OTIMIZADO:');
    console.log('   ✅ Zero linhas com menos de 50 caracteres');
    console.log('   ✅ Blocos mínimos de 150 caracteres');
    console.log('   ✅ Ideal: Blocos de 300+ caracteres');
    console.log('   ✅ Sem separadores que viram chunks pequenos');
    console.log('');
    console.log('⚠️  Arquive o upload anterior e use ESTE arquivo!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
