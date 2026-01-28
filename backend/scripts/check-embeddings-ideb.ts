/**
 * Verificar embeddings dos documentos IDEB 2023
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkEmbeddings() {
  console.log('🔍 VERIFICANDO EMBEDDINGS DOS CHUNKS IDEB 2023\n');
  
  // Buscar chunks dos documentos IDEB 2023
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select(`
      id,
      content,
      document_version:document_versions!inner(
        document:documents!inner(
          name,
          domain,
          subdomain,
          metadata_year
        )
      )
    `)
    .eq('document_version.document.domain', 'INDICADORES_EDUCACIONAIS')
    .eq('document_version.document.subdomain', 'IDEB')
    .eq('document_version.document.metadata_year', 2023);
  
  console.log(`📊 Total de chunks IDEB 2023: ${chunks?.length || 0}\n`);
  
  if (!chunks || chunks.length === 0) {
    console.log('❌ Nenhum chunk encontrado\n');
    return;
  }
  
  // Verificar embeddings para cada chunk
  for (const chunk of chunks) {
    const { data: embeddings } = await supabase
      .from('document_embeddings')
      .select('id, model')
      .eq('document_chunk_id', chunk.id);
    
    const docName = (chunk.document_version as any).document.name;
    
    if (!embeddings || embeddings.length === 0) {
      console.log(`❌ Chunk ${chunk.id.slice(0, 8)} (${docName}): SEM EMBEDDING`);
    } else {
      console.log(`✅ Chunk ${chunk.id.slice(0, 8)} (${docName}): ${embeddings.length} embedding(s)`);
    }
  }
  
  // Contar totais
  const { data: allEmbeddings } = await supabase
    .from('document_embeddings')
    .select('id')
    .in('document_chunk_id', chunks.map(c => c.id));
  
  console.log(`\n📊 RESUMO:`);
  console.log(`   Chunks: ${chunks.length}`);
  console.log(`   Embeddings: ${allEmbeddings?.length || 0}`);
  console.log(`   Faltando: ${chunks.length - (allEmbeddings?.length || 0)}\n`);
}

checkEmbeddings().catch(console.error);
