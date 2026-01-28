/**
 * Text Extractor Service
 * 
 * Extrai texto de documentos (PDF, DOCX, XLSX, TXT)
 * SEM usar IA, SEM OCR
 * 
 * Métodos suportados:
 * - PDF: pdf-parse
 * - DOCX: mammoth
 * - XLSX/XLS: xlsx
 * - TXT/MD: leitura direta
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// ==========================================
// INTERFACES
// ==========================================

export interface ExtractionResult {
  text: string;
  method: 'pdf-parse' | 'mammoth' | 'xlsx' | 'direct';
  success: boolean;
  isTabular?: boolean;  // Indica se é dado tabular (CSV/Excel)
  error?: string;
  metadata?: {
    pageCount?: number;
    sheetCount?: number;
    wordCount?: number;
    charCount?: number;
  };
}

// ==========================================
// TEXT EXTRACTOR SERVICE
// ==========================================

class TextExtractorService {
  
  /**
   * Extrai texto de um arquivo baseado no tipo
   */
  async extractText(fileBuffer: Buffer, fileType: string, fileName: string): Promise<ExtractionResult> {
    console.log(`📄 Extraindo texto de: ${fileName} (tipo: ${fileType})`);
    
    try {
      // PDF
      if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await this.extractFromPDF(fileBuffer);
      }
      
      // DOCX
      if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.toLowerCase().endsWith('.docx')
      ) {
        return await this.extractFromDOCX(fileBuffer);
      }
      
      // XLSX (Excel moderno)
      if (
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileName.toLowerCase().endsWith('.xlsx')
      ) {
        return await this.extractFromExcel(fileBuffer);
      }
      
      // XLS (Excel legado)
      if (
        fileType === 'application/vnd.ms-excel' ||
        fileName.toLowerCase().endsWith('.xls')
      ) {
        return await this.extractFromExcel(fileBuffer);
      }
      
      // CSV (Comma-Separated Values)
      if (
        fileType === 'text/csv' ||
        fileType === 'application/csv' ||
        fileType === 'text/comma-separated-values' ||
        fileName.toLowerCase().endsWith('.csv')
      ) {
        return await this.extractFromExcel(fileBuffer); // CSV usa mesma biblioteca (xlsx)
      }
      
      // DOC (antigo) - não suportado sem OCR
      if (fileType === 'application/msword' || fileName.toLowerCase().endsWith('.doc')) {
        return {
          text: '',
          method: 'direct',
          success: false,
          error: 'Formato .doc não suportado. Por favor, converta para .docx ou .pdf'
        };
      }
      
      // TXT / MD
      if (
        fileType === 'text/plain' ||
        fileType === 'text/markdown' ||
        fileName.toLowerCase().match(/\.(txt|md)$/)
      ) {
        return await this.extractFromText(fileBuffer);
      }
      
      return {
        text: '',
        method: 'direct',
        success: false,
        error: `Tipo de arquivo não suportado para extração: ${fileType}`
      };
      
    } catch (error: any) {
      console.error('❌ Erro na extração de texto:', error);
      return {
        text: '',
        method: 'direct',
        success: false,
        error: error.message || 'Erro desconhecido na extração'
      };
    }
  }
  
  /**
   * Extrai texto de PDF usando pdf-parse
   */
  private async extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const data = await pdfParse(buffer);
      
      const text = this.cleanText(data.text);
      
      return {
        text,
        method: 'pdf-parse',
        success: true,
        metadata: {
          pageCount: data.numpages,
          wordCount: this.countWords(text),
          charCount: text.length
        }
      };
      
    } catch (error: any) {
      console.error('Erro ao extrair PDF:', error);
      return {
        text: '',
        method: 'pdf-parse',
        success: false,
        error: `Falha na extração de PDF: ${error.message}`
      };
    }
  }
  
  /**
   * Extrai texto de DOCX usando mammoth
   */
  private async extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      const text = this.cleanText(result.value);
      
      return {
        text,
        method: 'mammoth',
        success: true,
        metadata: {
          wordCount: this.countWords(text),
          charCount: text.length
        }
      };
      
    } catch (error: any) {
      console.error('Erro ao extrair DOCX:', error);
      return {
        text: '',
        method: 'mammoth',
        success: false,
        error: `Falha na extração de DOCX: ${error.message}`
      };
    }
  }

  /**
   * Extrai texto de Excel (XLSX/XLS) usando xlsx
   * Converte todas as planilhas em texto formatado
   */
  private async extractFromExcel(buffer: Buffer): Promise<ExtractionResult> {
    try {
      // Ler workbook
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      let fullText = '';
      const sheetNames = workbook.SheetNames;
      
      console.log(`📊 Excel contém ${sheetNames.length} planilha(s): ${sheetNames.join(', ')}`);
      
      // Processar cada planilha
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Adicionar nome da planilha como cabeçalho
        fullText += `\n\n=== PLANILHA: ${sheetName} ===\n\n`;
        
        // Método 1: Converter para JSON (mais confiável que CSV)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData && jsonData.length > 0) {
          // Converter JSON para texto tabular
          for (const row of jsonData as any[]) {
            if (Array.isArray(row) && row.length > 0) {
              const rowText = row
                .filter(cell => cell !== null && cell !== undefined && cell !== '')
                .join(' | ');
              
              if (rowText.trim()) {
                fullText += rowText + '\n';
              }
            }
          }
        }
        
        // Método 2: Também extrair valores brutos como fallback
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        let plainText = '';
        let cellCount = 0;
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell && cell.v != null && cell.v !== '') {
              plainText += ` ${cell.v}`;
              cellCount++;
            }
          }
        }
        
        fullText += `\n\n[Dados brutos - ${cellCount} células]: ${plainText.trim()}\n`;
        
        console.log(`📊 Planilha "${sheetName}": ${jsonData.length} linhas, ${cellCount} células com dados`);
      }
      
      console.log(`📝 Texto ANTES de limpar: ${fullText.length} caracteres`);
      const text = this.cleanText(fullText);
      console.log(`📝 Texto DEPOIS de limpar: ${text.length} caracteres`);
      console.log(`📝 Preview (200 chars): ${text.substring(0, 200)}...`);
      
      return {
        text,
        method: 'xlsx',
        success: true,
        isTabular: true,  // Marcar como tabular para otimizar chunking
        metadata: {
          sheetCount: sheetNames.length,
          wordCount: this.countWords(text),
          charCount: text.length
        }
      };
      
    } catch (error: any) {
      console.error('Erro ao extrair Excel:', error);
      return {
        text: '',
        method: 'xlsx',
        success: false,
        error: `Falha na extração de Excel: ${error.message}`
      };
    }
  }
  
  /**
   * Extrai texto de arquivo TXT/MD (leitura direta)
   */
  private async extractFromText(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const text = this.cleanText(buffer.toString('utf-8'));
      
      return {
        text,
        method: 'direct',
        success: true,
        metadata: {
          wordCount: this.countWords(text),
          charCount: text.length
        }
      };
      
    } catch (error: any) {
      console.error('Erro ao ler arquivo de texto:', error);
      return {
        text: '',
        method: 'direct',
        success: false,
        error: `Falha na leitura do arquivo: ${error.message}`
      };
    }
  }
  
  /**
   * Limpa texto extraído
   * - Remove múltiplas quebras de linha
   * - Remove espaços excessivos
   * - Normaliza espaçamento
   */
  private cleanText(text: string): string {
    return text
      // Remove múltiplas quebras de linha consecutivas (3 ou mais → 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove espaços múltiplos
      .replace(/ {2,}/g, ' ')
      // Remove espaços no início/fim de cada linha
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Remove espaços antes/depois do texto inteiro
      .trim();
  }
  
  /**
   * Conta palavras no texto
   */
  private countWords(text: string): number {
    return text
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }
  
  /**
   * Valida se o texto extraído é válido para processamento
   */
  validateExtractedText(text: string): { valid: boolean; reason?: string } {
    // Texto vazio
    if (!text || text.trim().length === 0) {
      return { valid: false, reason: 'Texto extraído está vazio' };
    }
    
    // Texto muito curto (menos de 100 caracteres)
    if (text.length < 100) {
      return { valid: false, reason: 'Texto extraído muito curto (< 100 caracteres)' };
    }
    
    // Verificar se tem caracteres legíveis (não é só símbolos)
    const readableChars = text.replace(/[^a-zA-Z0-9À-ÿ]/g, '').length;
    const ratio = readableChars / text.length;
    
    if (ratio < 0.5) {
      return { valid: false, reason: 'Texto com muitos caracteres ilegíveis (possível falha na extração)' };
    }
    
    return { valid: true };
  }
  
}

// Singleton
const textExtractorService = new TextExtractorService();
export default textExtractorService;
