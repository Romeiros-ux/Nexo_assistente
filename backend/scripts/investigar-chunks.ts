/**
 * Script para identificar chunks problemáticos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigar() {
  console.log('🔍 Investigando chunks problemáticos...\n');

  const { data: doc } = await supabase
    .from('documents')
    .select('id')
    .ilike('name', '%Cadastro de Trabalhadores%')
    .single();

  const { data: version } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', doc!.id)
    .single();

  // Buscar últimos chunks (batch 133 = chunks 6600-6616)
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('chunk_index, content')
    .eq('document_version_id', version!.id)
    .gte('chunk_index', 6600)
    .order('chunk_index');

  console.log('📊 Últimos chunks (6600-6616):');
  chunks?.forEach(chunk => {
    const chars = chunk.content.length;
    const estimatedTokens = Math.ceil(chars / 4); // Aproximação: 1 token ≈ 4 chars
    console.log(`\nChunk ${chunk.chunk_index}:`);
    console.log(`  Caracteres: ${chars}`);
    console.log(`  Tokens (estimado): ${estimatedTokens}`);
    
    if (estimatedTokens > 8000 || chars > 30000) {
      console.log(`  ⚠️  PROBLEMA! Chunk muito grande!`);
      console.log(`  Primeiros 200 chars: ${chunk.content.substring(0, 200)}`);
      console.log(`  Últimos 200 chars: ${chunk.content.substring(chunk.content.length - 200)}`);
    }
  });
}

investigar();
