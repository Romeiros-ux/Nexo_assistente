/**
 * Script para investigar o chunk #39 que está gerando 8935 tokens
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const VERSION_ID = 'c20fa652-0ccc-4739-bbd6-947d6b8aecf1';

async function investigar() {
  try {
    console.log('🔍 Buscando chunks da versão...\n');
    
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('chunk_index, content')
      .eq('document_version_id', VERSION_ID)
      .order('chunk_index', { ascending: true });

    if (error || !chunks) {
      console.error('❌ Erro:', error);
      return;
    }

    console.log(`📊 Total de chunks: ${chunks.length}\n`);
    
    // Analisar todos os chunks
    for (const chunk of chunks) {
      const length = chunk.content.length;
      
      // Estimar tokens (aproximadamente 1 token = 4 caracteres)
      const estimatedTokens = Math.ceil(length / 4);
      
      if (length > 300 || estimatedTokens > 100) {
        console.log(`⚠️  Chunk #${chunk.chunk_index}:`);
        console.log(`   Tamanho: ${length} caracteres`);
        console.log(`   Tokens estimados: ${estimatedTokens}`);
        console.log(`   Preview: ${chunk.content.substring(0, 200)}...`);
        console.log('');
      }
    }
    
    // Mostrar especificamente o chunk #39
    const chunk39 = chunks.find(c => c.chunk_index === 39);
    if (chunk39) {
      console.log('=' .repeat(60));
      console.log('🎯 CHUNK #39 (PROBLEMÁTICO):');
      console.log('='.repeat(60));
      console.log(`Tamanho: ${chunk39.content.length} caracteres`);
      console.log(`Tokens estimados: ${Math.ceil(chunk39.content.length / 4)}`);
      console.log('');
      console.log('Conteúdo completo:');
      console.log(chunk39.content);
      console.log('='.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

investigar();
