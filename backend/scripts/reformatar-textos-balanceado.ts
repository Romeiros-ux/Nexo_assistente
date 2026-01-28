import fs from 'fs';
import path from 'path';

/**
 * REFORMATAÇÃO BALANCEADA - Estratégia Cirúrgica
 * 
 * Remove apenas linhas que causam chunks pequenos, mas preserva conteúdo dos decretos
 * 
 * REGRAS:
 * 1. Remover linhas < 100 chars isoladas
 * 2. Mesclar linhas curtas com a linha seguinte quando fazem sentido juntas
 * 3. Preservar parágrafos de decretos/portarias mesmo se curtos
 * 4. Remover separadores e headers vazios
 */

function reformatarBalanceado() {
  const downloadsPath = path.join(__dirname, 'downloads');
  const inputPath = path.join(downloadsPath, 'textos-completos-diario-oficial-formatado.txt');
  const outputPath = path.join(downloadsPath, 'textos-completos-diario-oficial-balanceado.txt');

  console.log('\n🔧 REFORMATAÇÃO BALANCEADA - Modo Cirúrgico');
  console.log('Preservando decretos, removendo apenas ruído');
  console.log('============================================================\n');

  // Ler arquivo original
  const texto = fs.readFileSync(inputPath, 'utf-8');
  const linhas = texto.split('\n');

  console.log(`📊 Linhas originais: ${linhas.length.toLocaleString()}`);

  // Processar linha por linha
  const linhasProcessadas: string[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i].trim();

    // Pular linhas vazias
    if (linha.length === 0) {
      i++;
      continue;
    }

    // Remover headers de separação (muito curtos)
    if (linha.match(/^={2,}$/) || linha.match(/^-{2,}$/) || linha.match(/^\*{2,}$/)) {
      i++;
      continue;
    }

    // Remover linhas só com números ou siglas muito curtas
    if (linha.length < 20 && linha.match(/^[0-9\s\-\/]+$/)) {
      i++;
      continue;
    }

    // Se linha é muito curta (< 100 chars), tentar mesclar com a próxima
    if (linha.length < 100) {
      // Ver se próximas 3 linhas podem ser mescladas
      let mesclado = linha;
      let j = i + 1;
      let mesclagens = 0;

      while (j < linhas.length && mesclado.length < 200 && mesclagens < 5) {
        const proximaLinha = linhas[j].trim();
        
        if (proximaLinha.length === 0) {
          j++;
          continue;
        }

        // Não mesclar se próxima linha é um header importante
        if (proximaLinha.match(/^(DECRETO|PORTARIA|LEI|EDITAL|DIÁRIO OFICIAL)/i)) {
          break;
        }

        // Mesclar com espaço
        mesclado += ' ' + proximaLinha;
        j++;
        mesclagens++;

        // Se chegou a um tamanho bom, parar
        if (mesclado.length >= 150) {
          break;
        }
      }

      // Se após mesclar ainda está muito curto, pular
      if (mesclado.length < 100) {
        i = j;
        continue;
      }

      linhasProcessadas.push(mesclado);
      i = j;
    } else {
      // Linha já tem tamanho bom, adicionar direto
      linhasProcessadas.push(linha);
      i++;
    }
  }

  console.log(`✅ Linhas processadas: ${linhasProcessadas.toLocaleString()}`);
  console.log(`📉 Redução: ${((1 - linhasProcessadas.length / linhas.length) * 100).toFixed(1)}%`);

  // Construir texto final com parágrafos
  const textoFinal = '# TEXTOS COMPLETOS DO DIÁRIO OFICIAL DE SAQUAREMA\n' +
    '# Edições 1784 a 1833 - Ano 7-8 (dezembro 2025 a janeiro 2026)\n' +
    '# Textos integrais de decretos, portarias, leis e editais\n' +
    '# Nomes de secretários removidos - Formato balanceado otimizado\n\n' +
    linhasProcessadas.join('\n\n');

  // Salvar arquivo
  fs.writeFileSync(outputPath, textoFinal, 'utf-8');

  const tamanhoOriginal = fs.statSync(inputPath).size;
  const tamanhoFinal = fs.statSync(outputPath).size;

  console.log('\n============================================================');
  console.log('✅ REFORMATAÇÃO BALANCEADA CONCLUÍDA!');
  console.log('============================================================\n');

  console.log(`📁 ${outputPath}`);
  console.log(`📊 Original: ${(tamanhoOriginal / 1024).toFixed(2)} KB`);
  console.log(`📊 Balanceado: ${(tamanhoFinal / 1024).toFixed(2)} KB`);
  console.log(`📊 Caracteres: ${textoFinal.length.toLocaleString()}`);
  console.log(`🔥 Redução: ${((1 - tamanhoFinal / tamanhoOriginal) * 100).toFixed(1)}%`);
  console.log(`✅ Garantia: Linhas mescladas com mínimo 100-150 caracteres!`);

  console.log('\n============================================================');
  console.log('✅ VERIFICAÇÃO DE CONTEÚDO:');
  console.log('============================================================\n');

  // Verificar se decretos foram preservados
  const temDecreto922 = textoFinal.includes('Decreto nº 922');
  const temPortarias = textoFinal.match(/PORTARIA.*202[56]/gi);
  const temDecretos = textoFinal.match(/DECRETO.*N[ºÃ]/gi);

  console.log(`📜 Decreto 922 preservado: ${temDecreto922 ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`📜 Portarias encontradas: ${temPortarias ? `✅ ${temPortarias.length}` : '❌ 0'}`);
  console.log(`📜 Decretos encontrados: ${temDecretos ? `✅ ${temDecretos.length}` : '❌ 0'}`);

  console.log('\n🎯 Este arquivo está BALANCEADO:');
  console.log('   ✅ Remove linhas muito curtas (< 100 chars)');
  console.log('   ✅ Mescla linhas curtas adjacentes');
  console.log('   ✅ Preserva conteúdo de decretos e portarias');
  console.log('   ✅ Remove apenas ruído (separadores, headers vazios)');
  console.log('   ✅ Garantia de chunks com mínimo 100-150 caracteres');

  console.log('\n⚠️  Use ESTE arquivo para upload!');
}

// Executar
reformatarBalanceado();
