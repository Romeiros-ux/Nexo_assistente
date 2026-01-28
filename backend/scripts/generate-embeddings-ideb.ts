/**
 * Gerar embeddings para chunks IDEB 2023 que não têm
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbeddings() {
  console.log('🔄 GERANDO EMBEDDINGS PARA CHUNKS IDEB 2023\n');
  
  // Buscar chunks IDEB 2023 (via SQL direto para evitar problemas de JOIN)
  const { data: results } = await supabase.rpc('get_ideb_chunks_2023', {});
  
  // Se a função não existir, fazer manualmente
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('domain', 'INDICADORES_EDUCACIONAIS')
    .eq('subdomain', 'IDEB')
    .eq('metadata_year', 2023);
  
  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento IDEB 2023 encontrado\n');
    return;
  }
  
  console.log(`✅ Encontrados ${docs.length} documentos IDEB 2023\n`);
  
  // Para cada documento, buscar versão e chunks
  for (const doc of docs) {
    // Buscar versão
    const { data: versions } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!versions || versions.length === 0) continue;
    
    const versionId = versions[0].id;
    
    // Buscar chunks
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_version_id', versionId);
    
    if (!chunks || chunks.length === 0) continue;
    
    console.log(`📄 Documento ${doc.id.slice(0, 8)}: ${chunks.length} chunks`);
    
    // Para cada chunk, verificar se tem embedding
    for (const chunk of chunks) {
      // Verificar se já tem embedding
      const { data: existing } = await supabase
        .from('document_embeddings')
        .select('id')
        .eq('document_chunk_id', chunk.id)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`   ⏭️ Chunk ${chunk.id.slice(0, 8)}: já tem embedding`);
        continue;
      }
      
      console.log(`   🔄 Gerando embedding para chunk ${chunk.id.slice(0, 8)}...`);
      
      // Gerar embedding com OpenAI
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-large',
            input: chunk.content,
            dimensions: 1536,  // IMPORTANTE: Reduzir para 1536
          }),
        });
        
        const data = await response.json();
        
        if (!data.data || !data.data[0]) {
          console.log(`   ❌ Erro na API OpenAI: ${JSON.stringify(data)}`);
          continue;
        }
        
        const embedding = data.data[0].embedding;
        
        // Inserir embedding
        const { error } = await supabase
          .from('document_embeddings')
          .insert({
            document_chunk_id: chunk.id,
            embedding,
            model: 'text-embedding-3-large',
            tokens_used: data.usage.total_tokens,
          });
        
        if (error) {
          console.log(`   ❌ Erro ao inserir: ${error.message}`);
        } else {
          console.log(`   ✅ Embedding criado!`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error}`);
      }
    }
    
    console.log();
  }
  
  console.log('✅ PROCESSO CONCLUÍDO!\n');
}

generateEmbeddings().catch(console.error);
