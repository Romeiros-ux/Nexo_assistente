/**
 * Script para download automatizado de PDFs
 * 
 * Este script baixa todos os PDFs listados em documents-list.json
 * e os salva na pasta downloads/ para posterior processamento.
 * 
 * Uso:
 *   npx tsx scripts/download-pdfs.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface Document {
  id: number;
  url: string;
  title: string;
  type: string;
  priority: string;
  category: string;
}

interface DocumentsList {
  documents: Document[];
  webPages: any[];
  metadata: any;
}

const CONFIG_FILE = path.join(__dirname, 'config', 'documents-list.json');
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const LOG_FILE = path.join(__dirname, 'download-log.json');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface DownloadResult {
  id: number;
  title: string;
  url: string;
  status: 'success' | 'failed' | 'skipped';
  filePath?: string;
  error?: string;
  size?: number;
  downloadedAt?: string;
}

class PDFDownloader {
  private results: DownloadResult[] = [];

  async run() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Download Automatizado de PDFs       ║${colors.reset}`);
    console.log(`${colors.cyan}║   Saquarema - Base de Conhecimento    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

    // Carregar lista de documentos
    const documentsList = this.loadDocumentsList();
    console.log(`${colors.blue}📋 Total de documentos: ${documentsList.documents.length}${colors.reset}\n`);

    // Criar pasta de downloads se não existir
    this.ensureDownloadsDir();

    // Processar por prioridade
    const critical = documentsList.documents.filter(d => d.priority === 'CRITICAL');
    const high = documentsList.documents.filter(d => d.priority === 'HIGH');
    const medium = documentsList.documents.filter(d => d.priority === 'MEDIUM');
    const low = documentsList.documents.filter(d => d.priority === 'LOW');

    console.log(`${colors.yellow}🔥 CRÍTICOS: ${critical.length}${colors.reset}`);
    await this.downloadBatch(critical, 'CRÍTICO');

    console.log(`\n${colors.yellow}⭐ IMPORTANTES: ${high.length}${colors.reset}`);
    await this.downloadBatch(high, 'IMPORTANTE');

    console.log(`\n${colors.yellow}📄 MÉDIOS: ${medium.length}${colors.reset}`);
    await this.downloadBatch(medium, 'MÉDIO');

    console.log(`\n${colors.yellow}📋 BAIXOS: ${low.length}${colors.reset}`);
    await this.downloadBatch(low, 'BAIXO');

    // Salvar log
    this.saveLog();

    // Resumo final
    this.printSummary();
  }

  private loadDocumentsList(): DocumentsList {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`${colors.red}❌ Erro ao carregar ${CONFIG_FILE}${colors.reset}`);
      throw error;
    }
  }

  private ensureDownloadsDir() {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
      console.log(`${colors.green}✅ Pasta downloads/ criada${colors.reset}`);
    }
  }

  private async downloadBatch(documents: Document[], priority: string) {
    for (const doc of documents) {
      await this.downloadDocument(doc);
      // Pausa de 1 segundo entre downloads para não sobrecarregar servidores
      await this.sleep(1000);
    }
  }

  private async downloadDocument(doc: Document): Promise<void> {
    const fileName = this.sanitizeFileName(doc.title) + '.pdf';
    const filePath = path.join(DOWNLOADS_DIR, fileName);

    // Verificar se já existe
    if (fs.existsSync(filePath)) {
      console.log(`${colors.yellow}⏭️  [${doc.id}] ${doc.title} (já existe)${colors.reset}`);
      this.results.push({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        status: 'skipped',
        filePath,
      });
      return;
    }

    try {
      console.log(`${colors.blue}⬇️  [${doc.id}] Baixando: ${doc.title}${colors.reset}`);

      const response = await axios.get(doc.url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 1 minuto de timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      fs.writeFileSync(filePath, response.data);
      const size = response.data.length;
      const sizeKB = (size / 1024).toFixed(2);

      console.log(`${colors.green}✅ [${doc.id}] ${doc.title} (${sizeKB} KB)${colors.reset}`);

      this.results.push({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        status: 'success',
        filePath,
        size,
        downloadedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`${colors.red}❌ [${doc.id}] Erro: ${doc.title}${colors.reset}`);
      console.error(`   Motivo: ${error.message}`);

      this.results.push({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        status: 'failed',
        error: error.message,
      });
    }
  }

  private sanitizeFileName(title: string): string {
    return title
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveLog() {
    const log = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        success: this.results.filter(r => r.status === 'success').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length,
      },
    };

    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    console.log(`\n${colors.cyan}📝 Log salvo em: ${LOG_FILE}${colors.reset}`);
  }

  private printSummary() {
    const success = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const totalSize = this.results
      .filter(r => r.size)
      .reduce((sum, r) => sum + (r.size || 0), 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║           RESUMO DO DOWNLOAD           ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.green}✅ Sucesso:    ${success}${colors.reset}`);
    console.log(`${colors.red}❌ Falhas:     ${failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Pulados:    ${skipped}${colors.reset}`);
    console.log(`${colors.blue}📦 Total:      ${this.results.length}${colors.reset}`);
    console.log(`${colors.cyan}💾 Tamanho:    ${totalSizeMB} MB${colors.reset}\n`);

    if (failed > 0) {
      console.log(`${colors.yellow}⚠️  Documentos com falha:${colors.reset}`);
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - [${r.id}] ${r.title}`);
          console.log(`     ${r.error}`);
        });
    }

    console.log(`\n${colors.green}🎉 Download concluído!${colors.reset}`);
    console.log(`${colors.blue}📂 Arquivos em: ${DOWNLOADS_DIR}${colors.reset}\n`);
  }
}

// Executar
const downloader = new PDFDownloader();
downloader.run().catch(error => {
  console.error(`${colors.red}❌ Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
