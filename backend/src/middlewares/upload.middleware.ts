/**
 * Middleware de Upload com Multer
 * 
 * Gerencia upload de arquivos multipart/form-data
 * Validações:
 * - Tipo de arquivo (PDF, DOCX, DOC, MD)
 * - Tamanho máximo (50 MB)
 * - Apenas em memória (buffer)
 */

import multer from 'multer';

// ==========================================
// CONFIGURAÇÕES
// ==========================================

// Tamanho máximo: 50 MB
const MAX_FILE_SIZE = 52428800; // 50 * 1024 * 1024

// Tipos permitidos
const ALLOWED_MIME_TYPES = [
  'application/pdf',                                                             // .pdf
  'application/msword',                                                          // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.ms-excel',                                                    // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'text/csv',                                                                    // .csv
  'application/csv',                                                             // .csv (alternativo)
  'text/comma-separated-values',                                                 // .csv (alternativo)
  'text/markdown',                                                               // .md
  'text/plain'                                                                   // .txt
];

// ==========================================
// STORAGE: MEMORY (Buffer)
// ==========================================

const storage = multer.memoryStorage();

// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (_req: any, file: any, cb: multer.FileFilterCallback) => {
  // Valida tipo de arquivo
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}. Permitidos: PDF, DOC, DOCX, XLS, XLSX, CSV, MD, TXT`));
  }
};

// ==========================================
// CONFIGURAÇÃO DO MULTER
// ==========================================

export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Apenas 1 arquivo por vez
  }
});

// ==========================================
// HELPER: Valida extensão do arquivo
// ==========================================

export function validateFileExtension(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.md', '.txt'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

// ==========================================
// HELPER: Retorna pasta por tipo de documento
// ==========================================

export function getStorageFolderByType(documentType: string): string {
  const folderMap: Record<string, string> = {
    'NORM': 'norms',
    'LAW': 'laws',
    'RESOLUTION': 'resolutions',
    'DIRECTIVE': 'directives',
    'MANUAL': 'manuals',
    'REPORT': 'reports',
    'OTHER': 'others'
  };
  
  return folderMap[documentType] || 'others';
}

// ==========================================
// HELPER: Sanitiza nome do arquivo
// ==========================================

export function sanitizeFilename(filename: string): string {
  // Remove caracteres especiais, mantém apenas letras, números, pontos e hífens
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9.-]/g, '_')  // Substitui caracteres especiais por _
    .toLowerCase();
}
