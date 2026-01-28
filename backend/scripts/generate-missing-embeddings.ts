import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('\n🔧 GERANDO EMBEDDINGS FALTANTES\n');

  // 1. Buscar todos os chunks de documentos Excel que não têm embeddings
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select(`
      id,
      content,
      chunk_index,
      document_version_id,
      document_versions!inner (
        document_id,
        documents!inner (
          name,
          document_type
        )
      )
    `)
    .eq('document_versions.documents.document_type', 'REPORT');

  if (error) {
    console.error('❌ Erro ao buscar chunks:', error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log('✅ Nenhum chunk encontrado');
    return;
  }

  console.log(`📊 Encontrados ${chunks.length} chunks\n`);

  // 2. Filtrar chunks que já têm embeddings
  const chunkIds = chunks.map(c => c.id);
  const { data: existingEmbeddings } = await supabase
    .from('document_embeddings')
    .select('document_chunk_id')
    .in('document_chunk_id', chunkIds);

  const existingChunkIds = new Set(existingEmbeddings?.map(e => e.document_chunk_id) || []);
  const chunksWithoutEmbeddings = chunks.filter(c => !existingChunkIds.has(c.id));

  console.log(`✅ Chunks com embeddings: ${existingEmbeddings?.length || 0}`);
  console.log(`⚠️  Chunks SEM embeddings: ${chunksWithoutEmbeddings.length}\n`);

  if (chunksWithoutEmbeddings.length === 0) {
    console.log('🎉 Todos os chunks já têm embeddings!');
    return;
  }

  // 3. Gerar e salvar embeddings faltantes
  let processed = 0;
  let errors = 0;

  for (const chunk of chunksWithoutEmbeddings) {
    try {
      // Gerar embedding
      const embedding = await generateEmbedding(chunk.content);

      // Salvar no banco
      const { error: insertError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
          tokens_used: Math.ceil(chunk.content.length / 4), // Aproximação
        });

      if (insertError) {
        console.error(`❌ Erro ao salvar embedding do chunk ${chunk.id}:`, insertError.message);
        errors++;
      } else {
        processed++;
        process.stdout.write(`\r  ✅ Progresso: ${processed}/${chunksWithoutEmbeddings.length} embeddings gerados`);
      }
    } catch (err: any) {
      console.error(`\n❌ Erro ao processar chunk ${chunk.id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n\n✅ CONCLUÍDO!`);
  console.log(`   Processados: ${processed}`);
  console.log(`   Erros: ${errors}`);
}

main().catch(console.error);
