/**
 * REFORMATAR TEXTOS COMPLETOS
 * 
 * Remove separadores de igual (====) que viram chunks de 2 chars
 * Junta parágrafos curtos para evitar chunks pequenos
 */

import * as fs from 'fs';
import * as path from 'path';

function reformatarTextosCompletos() {
  console.log('\n📄 REFORMATANDO: Textos Completos');
  console.log('='.repeat(60));
  
  const inputPath = path.join(__dirname, 'downloads', 'textos-completos-diario-oficial.txt');
  const outputPath = path.join(__dirname, 'downloads', 'textos-completos-diario-oficial-formatado.txt');
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  // Dividir por edições (separadores de 80 iguais)
  const edicoes = content.split(/={60,}/);
  
  let output = '# TEXTOS COMPLETOS DO DIÁRIO OFICIAL DE SAQUAREMA\n';
  output += '# Edições 1784 a 1833 (Ano 7-8, dezembro 2025 - janeiro 2026)\n';
  output += '# Textos integrais de decretos, portarias, leis e editais\n';
  output += '# Nomes de secretários removidos para evitar informações desatualizadas\n\n';
  
  for (const edicao of edicoes) {
    let texto = edicao.trim();
    if (!texto || texto.length < 50) continue;
    
    // Extrair número da edição do texto
    const matchEdicao = texto.match(/EDIÇÃO\s+(\d+\/\d+)/i);
    if (matchEdicao) {
      output += `\n### DIÁRIO OFICIAL - EDIÇÃO ${matchEdicao[1]} ###\n\n`;
      // Remover a linha do título
      texto = texto.replace(/={3,}\s*EDIÇÃO\s+\d+\/\d+\s*={3,}/gi, '');
    }
    
    // Limpar o texto
    texto = texto
      // Remover linhas de separadores
      .replace(/^={3,}$/gm, '')
      .replace(/^-{3,}$/gm, '')
      // Remover múltiplas quebras de linha (deixar no máximo 2)
      .replace(/\n{4,}/g, '\n\n\n')
      // Remover espaços extras
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    // Dividir em parágrafos
    const paragrafos = texto.split(/\n\n+/);
    
    for (const paragrafo of paragrafos) {
      const p = paragrafo.trim();
      if (p.length < 30) continue; // Pular parágrafos muito curtos
      
      // Se o parágrafo for muito curto, tentar juntar com o próximo
      if (p.length < 150 && p.length > 0) {
        output += p + ' ';
      } else if (p.length >= 150) {
        // Parágrafo com tamanho bom, adicionar normalmente
        if (output.endsWith(' ')) {
          output += p + '\n\n';
        } else {
          output += p + '\n\n';
        }
      }
    }
    
    output += '\n'; // Separador entre edições
  }
  
  fs.writeFileSync(outputPath, output, 'utf-8');
  
  const stats = fs.statSync(outputPath);
  const inputStats = fs.statSync(inputPath);
  
  console.log(`✅ Arquivo reformatado gerado!`);
  console.log(`📁 ${outputPath}`);
  console.log(`📊 Tamanho original: ${(inputStats.size / 1024).toFixed(2)} KB`);
  console.log(`📊 Tamanho reformatado: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📝 Caracteres: ${output.length.toLocaleString()}`);
  console.log(`🔧 Mudanças: Removidos separadores e juntados parágrafos curtos`);
  
  return outputPath;
}

async function main() {
  console.log('🔄 REFORMATANDO TEXTOS COMPLETOS');
  console.log('Removendo separadores e otimizando parágrafos');
  console.log('');
  
  try {
    const textoFormatado = reformatarTextosCompletos();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ REFORMATAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📂 ARQUIVO PRONTO PARA UPLOAD:');
    console.log('');
    console.log('2️⃣ TEXTOS COMPLETOS (reformatado):');
    console.log(`   📄 ${path.basename(textoFormatado)}`);
    console.log('   📁 Domínio: Diário Oficial');
    console.log('   📂 Subdomain: Textos Completos');
    console.log('');
    console.log('⚠️  IMPORTANTE: Arquive o upload anterior e use este novo arquivo!');
    console.log('   Formato otimizado evita chunks muito pequenos.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro na reformatação:', error);
    process.exit(1);
  }
}

main();
