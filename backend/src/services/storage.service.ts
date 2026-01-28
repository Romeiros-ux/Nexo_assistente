/**
 * Storage Service
 * 
 * Gerencia operações com Supabase Storage
 * - Upload de arquivos
 * - Download de arquivos
 * - Deleção de arquivos (soft delete)
 * - Geração de URLs temporárias
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getStorageFolderByType, sanitizeFilename } from '../middlewares/upload.middleware';

// ==========================================
// CONFIGURAÇÃO DO SUPABASE CLIENT
// ==========================================

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com service_role (acesso total ao storage)
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

const BUCKET_NAME = 'institutional-documents';

// ==========================================
// INTERFACES
// ==========================================

export interface UploadResult {
  path: string;
  fullPath: string;
  size: number;
  contentType: string;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

// ==========================================
// STORAGE SERVICE
// ==========================================

class StorageService {
  /**
   * Faz upload de arquivo para o Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    documentType: string
  ): Promise<UploadResult> {
    try {
      // 1. Define pasta baseada no tipo de documento
      const folder = getStorageFolderByType(documentType);
      
      // 2. Gera nome único do arquivo
      const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.'));
      const sanitizedName = sanitizeFilename(file.originalname.replace(fileExtension, ''));
      const uniqueFilename = `${uuidv4()}-${sanitizedName}${fileExtension}`;
      
      // 3. Path completo: folder/uuid-filename.ext
      const filePath = `${folder}/${uniqueFilename}`;
      
      // 4. Upload para o storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false // Nunca sobrescreve
        });
      
      if (error) {
        console.error('Erro ao fazer upload:', error);
        throw new Error(`Falha no upload: ${error.message}`);
      }
      
      // 5. Retorna informações do arquivo
      return {
        path: data.path,
        fullPath: `${BUCKET_NAME}/${data.path}`,
        size: file.size,
        contentType: file.mimetype
      };
      
    } catch (error) {
      console.error('StorageService.uploadFile error:', error);
      throw error;
    }
  }
  
  /**
   * Gera URL pública temporária (assinada) para download
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        console.error('Erro ao gerar URL assinada:', error);
        throw new Error(`Falha ao gerar URL: ${error.message}`);
      }
      
      return data.signedUrl;
      
    } catch (error) {
      console.error('StorageService.getSignedUrl error:', error);
      throw error;
    }
  }
  
  /**
   * Faz download do arquivo do storage
   */
  async downloadFile(filePath: string): Promise<DownloadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);
      
      if (error) {
        console.error('Erro ao fazer download:', error);
        throw new Error(`Falha no download: ${error.message}`);
      }
      
      // Converte Blob para Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extrai nome do arquivo do path
      const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
      
      return {
        buffer,
        contentType: data.type,
        filename
      };
      
    } catch (error) {
      console.error('StorageService.downloadFile error:', error);
      throw error;
    }
  }
  
  /**
   * Remove arquivo do storage
   * ⚠️ ATENÇÃO: Essa função NÃO deve ser chamada diretamente
   * Apenas para casos específicos de cleanup
   * Use soft delete (status='ARCHIVED') na tabela documents
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
      
      if (error) {
        console.error('Erro ao deletar arquivo:', error);
        throw new Error(`Falha ao deletar: ${error.message}`);
      }
      
      console.log(`Arquivo deletado do storage: ${filePath}`);
      
    } catch (error) {
      console.error('StorageService.deleteFile error:', error);
      throw error;
    }
  }
  
  /**
   * Lista arquivos em uma pasta
   */
  async listFiles(folder?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder || '', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) {
        console.error('Erro ao listar arquivos:', error);
        throw new Error(`Falha ao listar: ${error.message}`);
      }
      
      return data;
      
    } catch (error) {
      console.error('StorageService.listFiles error:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se arquivo existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: filePath.substring(filePath.lastIndexOf('/') + 1)
        });
      
      if (error) return false;
      
      return data.length > 0;
      
    } catch (error) {
      console.error('StorageService.fileExists error:', error);
      return false;
    }
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export default new StorageService();
