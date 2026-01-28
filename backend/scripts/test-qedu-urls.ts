/**
 * Teste de URLs do QEdu
 * Verifica quais páginas existem e quais dão erro 404
 */

import axios from 'axios';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// URLs para testar
const URLS_TO_TEST = [
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/ideb/escolas',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/censo-escolar',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/aprendizado',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/taxas-rendimento',
  
  // URLs alternativas para testar
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas/docentes',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas/funcao',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas/escolaridade',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas/idade',
  'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/pessoas/diretores',
];

async function testURL(url: string): Promise<void> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    log(`✅ ${url}`, 'green');
    log(`   Status: ${response.status}`, 'cyan');
    log(`   Tamanho: ${response.data.length.toLocaleString()} bytes`, 'cyan');
    
  } catch (error: any) {
    if (error.response) {
      log(`❌ ${url}`, 'red');
      log(`   Status: ${error.response.status}`, 'red');
    } else if (error.code === 'ECONNABORTED') {
      log(`⏱️  ${url}`, 'yellow');
      log(`   Timeout`, 'yellow');
    } else {
      log(`❌ ${url}`, 'red');
      log(`   Erro: ${error.message}`, 'red');
    }
  }
}

async function main() {
  log('\n🔍 TESTE DE URLs DO QEDU\n', 'cyan');

  for (const url of URLS_TO_TEST) {
    await testURL(url);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre requisições
  }

  log('\n✅ Teste concluído!\n', 'green');
}

main().catch(console.error);
