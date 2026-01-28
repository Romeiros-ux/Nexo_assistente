/**
 * Script para upload automatizado via API
 * 
 * Faz upload de todos os PDFs baixados para o backend
 * usando a API /api/v1/documents/upload
 * 
 * Uso:
 *   npx tsx scripts/upload-to-api.ts
 * 
 * Variáveis de ambiente necessárias:
 *   API_URL - URL do backend (padrão: http://127.0.0.1:3001)
 *   API_TOKEN - Token JWT de autenticação
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface UploadResult {
  fileName: string;
  status: 'success' | 'failed' | 'skipped';
  documentId?: string;
  error?: string;
  uploadedAt?: string;
}

class DocumentUploader {
  private apiUrl: string;
  private apiToken: string;
  private downloadsDir: string;
  private results: UploadResult[] = [];

  constructor() {
    this.apiUrl = process.env.API_URL || 'http://127.0.0.1:3001';
    this.apiToken = process.env.API_TOKEN || '';
    this.downloadsDir = path.join(__dirname, 'downloads');

    if (!this.apiToken) {
      console.error(`${colors.red}❌ Erro: API_TOKEN não configurado${colors.reset}`);
      console.log(`${colors.yellow}Execute primeiro:${colors.reset}`);
      console.log(`${colors.cyan}  $env:API_TOKEN="seu_token_aqui"${colors.reset}\n`);
      process.exit(1);
    }
  }

  async run() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Upload Automatizado para API        ║${colors.reset}`);
    console.log(`${colors.cyan}║   Saquarema - Base de Conhecimento    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.blue}🌐 API URL: ${this.apiUrl}${colors.reset}`);
    console.log(`${colors.blue}🔑 Token: ${this.apiToken.substring(0, 20)}...${colors.reset}\n`);

    // Verificar conexão com API
    await this.checkApiHealth();

    // Listar PDFs
    const pdfFiles = this.listPDFs();
    console.log(`${colors.blue}📄 Total de PDFs: ${pdfFiles.length}${colors.reset}\n`);

    if (pdfFiles.length === 0) {
      console.log(`${colors.yellow}⚠️  Nenhum PDF encontrado em ${this.downloadsDir}${colors.reset}`);
      console.log(`${colors.cyan}Execute primeiro: npx tsx scripts/download-pdfs.ts${colors.reset}\n`);
      return;
    }

    // Upload de cada arquivo
    for (const file of pdfFiles) {
      await this.uploadFile(file);
      await this.sleep(2000); // 2 segundos entre uploads
    }

    // Resumo final
    this.printSummary();
  }

  private async checkApiHealth() {
    try {
      console.log(`${colors.blue}🔍 Verificando conexão com API...${colors.reset}`);
      const response = await axios.get(`${this.apiUrl}/health`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        console.log(`${colors.green}✅ API online e funcionando${colors.reset}\n`);
      }
    } catch (error: any) {
      console.error(`${colors.red}❌ Erro ao conectar com API${colors.reset}`);
      console.error(`   ${error.message}`);
      console.log(`${colors.yellow}⚠️  Certifique-se que o backend está rodando${colors.reset}`);
      console.log(`${colors.cyan}   cd backend && npm start${colors.reset}\n`);
      process.exit(1);
    }
  }

  private listPDFs(): string[] {
    if (!fs.existsSync(this.downloadsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.downloadsDir)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(this.downloadsDir, file));
  }

  private async uploadFile(filePath: string) {
    const fileName = path.basename(filePath);
    console.log(`${colors.blue}⬆️  Enviando: ${fileName}${colors.reset}`);

    try {
      // Criar FormData
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('name', this.extractTitle(fileName));
      form.append('document_type', this.guessType(fileName));

      // Fazer upload
      const response = await axios.post(
        `${this.apiUrl}/api/v1/documents/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.apiToken}`,
          },
          timeout: 300000, // 5 minutos (processamento pode demorar)
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log(`${colors.green}✅ ${fileName} - ID: ${response.data.document?.id || 'N/A'}${colors.reset}`);

      this.results.push({
        fileName,
        status: 'success',
        documentId: response.data.document?.id,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`${colors.red}❌ ${fileName}${colors.reset}`);

      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Erro: ${error.response.data?.message || error.message}`);
      } else {
        console.error(`   ${error.message}`);
      }

      this.results.push({
        fileName,
        status: 'failed',
        error: error.response?.data?.message || error.message,
      });
    }
  }

  private extractTitle(fileName: string): string {
    return fileName
      .replace('.pdf', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private guessType(fileName: string): string {
    const lower = fileName.toLowerCase();

    // Tipos válidos: NORM, LAW, RESOLUTION, DIRECTIVE, MANUAL, REPORT, OTHER
    if (lower.includes('plano') || lower.includes('manual')) {
      return 'MANUAL';
    } else if (lower.includes('lei')) {
      return 'LAW';
    } else if (lower.includes('resolucao')) {
      return 'RESOLUTION';
    } else if (lower.includes('portaria') || lower.includes('diretriz')) {
      return 'DIRECTIVE';
    } else if (lower.includes('norma') || lower.includes('regimento')) {
      return 'NORM';
    } else if (lower.includes('relatorio')) {
      return 'REPORT';
    } else {
      return 'OTHER';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printSummary() {
    const success = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║           RESUMO DO UPLOAD             ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.green}✅ Sucesso: ${success}${colors.reset}`);
    console.log(`${colors.red}❌ Falhas:  ${failed}${colors.reset}`);
    console.log(`${colors.blue}📦 Total:   ${this.results.length}${colors.reset}\n`);

    if (failed > 0) {
      console.log(`${colors.yellow}⚠️  Arquivos com falha:${colors.reset}`);
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.fileName}`);
          console.log(`     ${r.error}`);
        });
      console.log();
    }

    if (success > 0) {
      console.log(`${colors.green}🎉 Upload concluído com sucesso!${colors.reset}`);
      console.log(`${colors.cyan}Agora você pode fazer perguntas sobre esses documentos no chat.${colors.reset}\n`);
    }

    // Salvar log
    const logPath = path.join(__dirname, 'upload-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
    }, null, 2));
    console.log(`${colors.cyan}📝 Log salvo em: ${logPath}${colors.reset}\n`);
  }
}

// Executar
const uploader = new DocumentUploader();
uploader.run().catch(error => {
  console.error(`${colors.red}❌ Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
