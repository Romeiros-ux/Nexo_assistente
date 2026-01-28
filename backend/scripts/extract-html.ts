/**
 * Script para extração de conteúdo HTML
 * 
 * Extrai conteúdo de páginas web listadas em documents-list.json
 * e converte para formato estruturado (JSON e Markdown).
 * 
 * Uso:
 *   npx tsx scripts/extract-html.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface WebPage {
  id: string;
  url: string;
  title: string;
  type: string;
  priority: string;
  category: string;
  extractMethod: string;
}

interface ExtractedContent {
  id: string;
  title: string;
  url: string;
  type: string;
  content: string;
  structuredData?: any;
  extractedAt: string;
  status: 'success' | 'failed';
  error?: string;
}

const CONFIG_FILE = path.join(__dirname, 'config', 'documents-list.json');
const OUTPUT_DIR = path.join(__dirname, 'extracted');
const LOG_FILE = path.join(__dirname, 'extraction-log.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class HTMLExtractor {
  private results: ExtractedContent[] = [];

  async run() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Extração de Conteúdo Web            ║${colors.reset}`);
    console.log(`${colors.cyan}║   Saquarema - Base de Conhecimento    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

    // Criar pasta de saída
    this.ensureOutputDir();

    // Carregar lista
    const config = this.loadConfig();
    console.log(`${colors.blue}🌐 Total de páginas: ${config.webPages.length}${colors.reset}\n`);

    // Processar cada página
    for (const page of config.webPages) {
      await this.extractPage(page);
      await this.sleep(2000); // 2 segundos entre requisições
    }

    // Salvar log
    this.saveLog();

    // Resumo
    this.printSummary();
  }

  private loadConfig() {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }

  private ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  private async extractPage(page: WebPage) {
    console.log(`${colors.blue}🔍 [${page.id}] Extraindo: ${page.title}${colors.reset}`);

    try {
      const response = await axios.get(page.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      let content = '';
      let structuredData: any = {};

      // Extração específica por tipo de página
      if (page.url.includes('qedu.org.br')) {
        const extracted = this.extractQEdu($);
        content = extracted.content;
        structuredData = extracted.data;
      } else if (page.url.includes('ibge.gov.br')) {
        const extracted = this.extractIBGE($);
        content = extracted.content;
        structuredData = extracted.data;
      } else if (page.url.includes('transparencia.saquarema')) {
        const extracted = this.extractTransparencia($);
        content = extracted.content;
        structuredData = extracted.data;
      } else {
        // Extração genérica
        content = this.extractGeneric($);
      }

      // Salvar arquivos
      const baseName = page.id.replace('web-', '');
      
      // Salvar como Markdown
      const mdPath = path.join(OUTPUT_DIR, `${baseName}-${page.title.replace(/\s+/g, '-')}.md`);
      fs.writeFileSync(mdPath, content);

      // Salvar como JSON
      const jsonPath = path.join(OUTPUT_DIR, `${baseName}-data.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2));

      console.log(`${colors.green}✅ [${page.id}] ${page.title}${colors.reset}`);
      console.log(`   📄 Markdown: ${path.basename(mdPath)}`);
      console.log(`   📊 JSON: ${path.basename(jsonPath)}`);

      this.results.push({
        id: page.id,
        title: page.title,
        url: page.url,
        type: page.type,
        content,
        structuredData,
        extractedAt: new Date().toISOString(),
        status: 'success',
      });
    } catch (error: any) {
      console.error(`${colors.red}❌ [${page.id}] Erro: ${page.title}${colors.reset}`);
      console.error(`   ${error.message}`);

      this.results.push({
        id: page.id,
        title: page.title,
        url: page.url,
        type: page.type,
        content: '',
        extractedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message,
      });
    }
  }

  private extractQEdu($: cheerio.CheerioAPI): { content: string; data: any } {
    const data: any = {
      municipio: 'Saquarema',
      escolas: null,
      alunos: null,
      professores: null,
      ideb: {},
      aprendizado: {},
      infraestrutura: {},
    };

    // Extrair números principais
    const situacao = $('h1:contains("Situação do municipio")').parent();
    situacao.find('div').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Escolas')) {
        data.escolas = parseInt(text.match(/\d+/)?.[0] || '0');
      } else if (text.includes('Alunos')) {
        data.alunos = parseInt(text.match(/[\d.]+/)?.[0]?.replace('.', '') || '0');
      } else if (text.includes('Professores')) {
        data.professores = parseInt(text.match(/[\d.]+/)?.[0]?.replace('.', '') || '0');
      }
    });

    // Montar markdown
    let content = `# Estatísticas Educacionais - Saquarema (QEdu)\n\n`;
    content += `**Fonte:** ${$('title').text() || 'QEdu'}\n`;
    content += `**Última atualização:** ${new Date().toISOString().split('T')[0]}\n\n`;
    content += `## Dados Gerais\n\n`;
    content += `- **Escolas:** ${data.escolas || 'N/D'}\n`;
    content += `- **Alunos Matriculados:** ${data.alunos?.toLocaleString('pt-BR') || 'N/D'}\n`;
    content += `- **Professores:** ${data.professores?.toLocaleString('pt-BR') || 'N/D'}\n\n`;
    content += `## Conteúdo Completo\n\n`;
    content += $('body').text().replace(/\s+/g, ' ').trim();

    return { content, data };
  }

  private extractIBGE($: cheerio.CheerioAPI): { content: string; data: any } {
    const data: any = {
      municipio: 'Saquarema',
      codigo: '3305505',
      populacao: {},
      economia: {},
    };

    let content = `# Panorama Demográfico - Saquarema (IBGE)\n\n`;
    content += `**Fonte:** IBGE Cidades\n`;
    content += `**Última atualização:** ${new Date().toISOString().split('T')[0]}\n\n`;
    content += `## Informações Municipais\n\n`;
    content += $('body').text().replace(/\s+/g, ' ').trim();

    return { content, data };
  }

  private extractTransparencia($: cheerio.CheerioAPI): { content: string; data: any } {
    const data: any = {
      links: [] as string[],
    };

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('.pdf')) {
        data.links.push(href);
      }
    });

    let content = `# Portal da Transparência - Saquarema\n\n`;
    content += `**Fonte:** transparencia.saquarema.rj.gov.br\n`;
    content += `**Última atualização:** ${new Date().toISOString().split('T')[0]}\n\n`;
    content += $('body').text().replace(/\s+/g, ' ').trim();

    return { content, data };
  }

  private extractGeneric($: cheerio.CheerioAPI): string {
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveLog() {
    const log = {
      timestamp: new Date().toISOString(),
      results: this.results,
    };
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  }

  private printSummary() {
    const success = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║           RESUMO DA EXTRAÇÃO           ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.green}✅ Sucesso: ${success}${colors.reset}`);
    console.log(`${colors.red}❌ Falhas:  ${failed}${colors.reset}`);
    console.log(`${colors.blue}📂 Saída:   ${OUTPUT_DIR}${colors.reset}\n`);
  }
}

// Executar
const extractor = new HTMLExtractor();
extractor.run().catch(error => {
  console.error(`${colors.red}❌ Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
