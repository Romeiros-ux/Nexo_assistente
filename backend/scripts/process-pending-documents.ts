/**
 * Script para processar documentos PENDING
 * 
 * Dispara o processamento dos documentos que estão pendentes:
 * - Extrai texto dos PDFs
 * - Gera chunks
 * - Cria embeddings com OpenAI
 * - Indexa no banco de dados
 */

import axios from 'axios';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function processDocuments() {
  const apiUrl = process.env.API_URL || 'https://edu-ia-assistente-backend.onrender.com';
  const apiToken = process.env.API_TOKEN;

  if (!apiToken) {
    console.error(`${colors.red}❌ Erro: API_TOKEN não configurado${colors.reset}`);
    console.log(`${colors.yellow}Execute:${colors.reset}`);
    console.log(`${colors.cyan}  $env:API_TOKEN="seu_token"${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Processar Documentos PENDING         ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}🌐 API URL: ${apiUrl}${colors.reset}`);
  console.log(`${colors.blue}🔑 Token: ${apiToken.substring(0, 20)}...${colors.reset}\n`);

  try {
    console.log(`${colors.yellow}⏳ Disparando processamento...${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Este processo pode levar 30-60 minutos (5-10 min por arquivo)${colors.reset}\n`);

    const response = await axios.post(
      `${apiUrl}/api/v1/indexing/process-pending`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 3600000, // 1 hora
      }
    );

    console.log(`${colors.green}✅ Processamento iniciado com sucesso!${colors.reset}\n`);
    console.log(`${colors.cyan}📊 Resultados:${colors.reset}`);
    console.log(JSON.stringify(response.data, null, 2));

    console.log(`\n${colors.green}🎉 Concluído!${colors.reset}`);
    console.log(`${colors.cyan}Agora você pode fazer perguntas no chat sobre os documentos.${colors.reset}\n`);

  } catch (error: any) {
    console.error(`${colors.red}❌ Erro ao processar documentos${colors.reset}`);
    
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Erro: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    } else {
      console.error(`${colors.red}${error.message}${colors.reset}`);
    }
    
    process.exit(1);
  }
}

processDocuments();
