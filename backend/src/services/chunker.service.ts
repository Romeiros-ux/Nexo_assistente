/**
 * Chunker Service
 * 
 * Divide texto em chunks (blocos semânticos) de 500-800 caracteres
 * com overlap de 50-100 caracteres para manter contexto
 * 
 * Regras institucionais:
 * - NÃO quebrar títulos
 * - NÃO quebrar listas numeradas/marcadas
 * - NÃO quebrar artigos legais
 * - Manter contexto entre chunks (overlap)
 */

// ==========================================
// INTERFACES
// ==========================================

export interface Chunk {
  content: string;
  index: number;
  metadata: {
    charCount: number;
    wordCount: number;
    startsWithTitle?: boolean;
    containsList?: boolean;
    containsArticle?: boolean;
    section?: string;
  };
}

export interface ChunkerConfig {
  minSize: number;  // 500
  maxSize: number;  // 800
  overlap: number;  // 50-100
}

// ==========================================
// CHUNKER SERVICE
// ==========================================

class ChunkerService {
  
  private readonly DEFAULT_CONFIG: ChunkerConfig = {
    minSize: 500,
    maxSize: 800,
    overlap: 75  // Meio termo entre 50-100
  };
  
  /**
   * Configuração otimizada para dados tabulares (CSV/Excel)
   * - Chunks menores (1-2 linhas de dados)
   * - Sem overlap (cada linha é independente)
   * - Preserva integridade dos registros
   * - IMPORTANTE: Máximo 300 chars para evitar exceder 8191 tokens na indexação
   */
  private readonly TABULAR_CONFIG: ChunkerConfig = {
    minSize: 100,   // Aceita chunks menores (1 linha de dados)
    maxSize: 300,   // Máximo 300 chars (evita exceder limite de 8191 tokens)
    overlap: 0      // Sem overlap para dados tabulares
  };
  
  /**
   * Divide texto em chunks seguindo regras semânticas
   * @param text - Texto a ser dividido
   * @param config - Configuração customizada (opcional)
   * @param isTabular - Se true, usa configuração otimizada para CSV/Excel (opcional)
   */
  async chunkText(text: string, config?: Partial<ChunkerConfig>, isTabular?: boolean): Promise<Chunk[]> {
    // Se for tabular e não tiver config customizada, usar TABULAR_CONFIG
    const baseConfig = isTabular && !config ? this.TABULAR_CONFIG : this.DEFAULT_CONFIG;
    const finalConfig = { ...baseConfig, ...config };
    
    const chunkType = isTabular ? 'dados tabulares (CSV/Excel)' : 'texto narrativo';
    console.log(`✂️ Dividindo ${chunkType} em chunks (${finalConfig.minSize}-${finalConfig.maxSize} chars, overlap ${finalConfig.overlap})`);
    
    // Para dados tabulares, usar lógica diferente (por linhas)
    if (isTabular) {
      const chunks = this.chunkTabularData(text, finalConfig);
      console.log(`✅ ${chunks.length} chunks criados`);
      return chunks;
    }
    
    // Para texto narrativo, usar lógica semântica (por parágrafos)
    // 1. Normalizar texto
    const normalizedText = this.normalizeText(text);
    
    // 2. Dividir em parágrafos (unidade base)
    const paragraphs = this.splitIntoParagraphs(normalizedText);
    
    // 3. Agrupar parágrafos em chunks respeitando limites
    const chunks = this.groupParagraphsIntoChunks(paragraphs, finalConfig);
    
    console.log(`✅ ${chunks.length} chunks criados`);
    
    return chunks;
  }
  
  /**
   * Chunking específico para dados tabulares (CSV/Excel)
   * - Divide por linhas (não por parágrafos)
   * - Agrupa linhas respeitando maxSize
   * - Quebra linhas muito longas em múltiplos chunks
   * - Sem overlap (cada linha é independente)
   */
  private chunkTabularData(text: string, config: ChunkerConfig): Chunk[] {
    const chunks: Chunk[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`📊 Total de linhas: ${lines.length}`);
    
    let currentChunk = '';
    let currentIndex = 0;
    
    for (const line of lines) {
      // Se a linha sozinha já é maior que maxSize, quebrar em múltiplos chunks
      if (line.length > config.maxSize) {
        console.log(`⚠️  Linha muito longa detectada: ${line.length} chars, quebrando em chunks menores...`);
        
        // Salvar chunk atual se existir
        if (currentChunk.length >= config.minSize) {
          chunks.push(this.createChunk(currentChunk, currentIndex));
          currentIndex++;
          currentChunk = '';
        }
        
        // Quebrar linha em pedaços de maxSize
        let remainingLine = line;
        while (remainingLine.length > 0) {
          const piece = remainingLine.substring(0, config.maxSize);
          chunks.push(this.createChunk(piece, currentIndex));
          currentIndex++;
          remainingLine = remainingLine.substring(config.maxSize);
        }
        
        continue;
      }
      
      const potentialChunk = currentChunk ? `${currentChunk}\n${line}` : line;
      
      // Se adicionar esta linha ultrapassa o limite máximo, salvar chunk atual
      if (potentialChunk.length > config.maxSize && currentChunk.length > 0) {
        // Só adiciona chunks com tamanho mínimo da config
        if (currentChunk.length >= config.minSize) {
          chunks.push(this.createChunk(currentChunk, currentIndex));
          currentIndex++;
        } else {
          console.log(`⚠️  Chunk muito pequeno descartado: ${currentChunk.length} chars (mínimo ${config.minSize})`);
        }
        currentChunk = line;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Adicionar último chunk se atender requisito mínimo
    if (currentChunk.length >= config.minSize) {
      chunks.push(this.createChunk(currentChunk, currentIndex));
    } else if (currentChunk.length > 0) {
      console.log(`⚠️  Último chunk muito pequeno descartado: ${currentChunk.length} chars (mínimo ${config.minSize})`);
    }
    
    return chunks;
  }
  
  /**
   * Normaliza texto para chunking
   */
  private normalizeText(text: string): string {
    return text
      // Remove espaços múltiplos
      .replace(/ {2,}/g, ' ')
      // Garante espaço após pontos
      .replace(/\.([A-Z])/g, '. $1')
      // Remove espaços antes de pontuação
      .replace(/ ([.,;:!?])/g, '$1')
      .trim();
  }
  
  /**
   * Divide texto em parágrafos (unidade base)
   */
  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)  // Duas ou mais quebras de linha = novo parágrafo
      .map(p => p.replace(/\n/g, ' ').trim())  // Remove quebras únicas
      .filter(p => p.length > 0);
  }
  
  /**
   * Agrupa parágrafos em chunks respeitando limites e regras
   */
  private groupParagraphsIntoChunks(paragraphs: string[], config: ChunkerConfig): Chunk[] {
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      
      // Se adicionar este parágrafo ultrapassa o limite máximo
      if (potentialChunk.length > config.maxSize && currentChunk.length > 0) {
        // Salvar chunk atual
        chunks.push(this.createChunk(currentChunk, currentIndex));
        currentIndex++;
        
        // Criar overlap: pegar últimas palavras do chunk anterior
        const overlapText = this.getOverlap(currentChunk, config.overlap);
        currentChunk = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
      } else {
        // Adicionar parágrafo ao chunk atual
        currentChunk = potentialChunk;
      }
      
      // Se chunk atingiu tamanho mínimo e próximo parágrafo é título, fechar chunk
      if (
        currentChunk.length >= config.minSize &&
        i < paragraphs.length - 1 &&
        this.isTitle(paragraphs[i + 1])
      ) {
        chunks.push(this.createChunk(currentChunk, currentIndex));
        currentIndex++;
        currentChunk = '';
      }
    }
    
    // Adicionar último chunk se houver
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, currentIndex));
    }
    
    return chunks;
  }
  
  /**
   * Cria objeto de chunk com metadados
   */
  private createChunk(content: string, index: number): Chunk {
    const words = content.split(/\s+/);
    
    return {
      content: content.trim(),
      index,
      metadata: {
        charCount: content.length,
        wordCount: words.length,
        startsWithTitle: this.isTitle(content.split('\n\n')[0]),
        containsList: this.containsList(content),
        containsArticle: this.containsArticle(content),
        section: this.extractSection(content)
      }
    };
  }
  
  /**
   * Extrai texto de overlap do final do chunk
   */
  private getOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    
    // Pegar últimas N palavras (não cortar no meio de palavra)
    const words = text.split(/\s+/);
    const overlapWords: string[] = [];
    let currentLength = 0;
    
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (currentLength + word.length > overlapSize) break;
      overlapWords.unshift(word);
      currentLength += word.length + 1; // +1 pelo espaço
    }
    
    return overlapWords.join(' ');
  }
  
  /**
   * Detecta se texto é um título
   * Características:
   * - Curto (< 100 caracteres)
   * - Começa com maiúscula ou número
   * - Pode terminar sem pontuação
   * - Pode ser "CAPÍTULO", "SEÇÃO", "ARTIGO", etc.
   */
  private isTitle(text: string): boolean {
    const trimmed = text.trim();
    
    // Títulos estruturais explícitos
    if (/^(CAPÍTULO|SEÇÃO|TÍTULO|ARTIGO|Art\.|ANEXO|PARTE)/i.test(trimmed)) {
      return true;
    }
    
    // Curto + Começa com maiúscula/número + Não termina com ponto
    if (
      trimmed.length < 100 &&
      /^[A-ZÀ-Ÿ0-9]/.test(trimmed) &&
      !/[.!?]$/.test(trimmed)
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Detecta se texto contém lista
   */
  private containsList(text: string): boolean {
    // Lista numerada: "1.", "2)", "I -", "a)"
    const numberedList = /^[\s]*[0-9IVXivx]+[.)]\s/m;
    
    // Lista marcada: "•", "-", "*" no início de linha
    const bulletList = /^[\s]*[•\-*]\s/m;
    
    return numberedList.test(text) || bulletList.test(text);
  }
  
  /**
   * Detecta se texto contém artigo legal
   */
  private containsArticle(text: string): boolean {
    return /Art\.\s*\d+|Artigo\s*\d+/i.test(text);
  }
  
  /**
   * Extrai seção/capítulo do texto (se houver)
   */
  private extractSection(text: string): string | undefined {
    const match = text.match(/^(CAPÍTULO|SEÇÃO|TÍTULO|ARTIGO|Art\.|ANEXO|PARTE)\s+[IVX0-9]+[^\n]*/i);
    return match ? match[0].trim() : undefined;
  }
  
  /**
   * Valida chunks gerados
   * @param chunks - Array de chunks a validar
   * @param isTabular - Se true, aplica regras mais flexíveis para dados tabulares
   */
  validateChunks(chunks: Chunk[], isTabular?: boolean): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (chunks.length === 0) {
      issues.push('Nenhum chunk gerado');
    }
    
    // Para dados tabulares, o limite mínimo é menor (uma linha pode ter 100-200 chars)
    const minChunkSize = isTabular ? 50 : 100;
    
    chunks.forEach((chunk, index) => {
      // Chunk muito pequeno (com tolerância para tabulares)
      if (chunk.content.length < minChunkSize) {
        issues.push(`Chunk ${index}: muito pequeno (${chunk.content.length} chars, mínimo ${minChunkSize})`);
      }
      
      // Chunk vazio
      if (chunk.content.trim().length === 0) {
        issues.push(`Chunk ${index}: vazio`);
      }
      
      // Índice incorreto
      if (chunk.index !== index) {
        issues.push(`Chunk ${index}: índice incorreto (${chunk.index})`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
}

// Singleton
const chunkerService = new ChunkerService();
export default chunkerService;
