/**
 * Script para verificar integridade dos dados do Cadastro de Trabalhadores
 * Compara arquivo CSV original com dados indexados no banco
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarDados() {
  console.log('🔍 Verificando dados do Cadastro de Trabalhadores...\n');

  // 1. Buscar documento no banco
  const { data: docs, error: docError } = await supabase
    .from('documents')
    .select('id, name, status, file_url')
    .ilike('name', '%Cadastro de Trabalhadores%')
    .single();

  if (docError || !docs) {
    console.error('❌ Erro ao buscar documento:', docError);
    return;
  }

  console.log('📄 Documento encontrado:', {
    id: docs.id,
    name: docs.name,
    status: docs.status
  });

  // 2. Buscar versão
  const { data: versions, error: versionError } = await supabase
    .from('document_versions')
    .select('id, version_number, status')
    .eq('document_id', docs.id)
    .single();

  if (versionError || !versions) {
    console.error('❌ Erro ao buscar versão:', versionError);
    return;
  }

  console.log('\n📋 Versão:', {
    id: versions.id,
    version_number: versions.version_number,
    status: versions.status
  });

  // 3. Contar chunks
  const { count: chunksCount, error: chunksError } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('document_version_id', versions.id);

  if (chunksError) {
    console.error('❌ Erro ao contar chunks:', chunksError);
    return;
  }

  console.log('\n📊 Total de chunks no banco:', chunksCount);

  // 4. Contar embeddings via join manual
  const { data: embeddingsData, error: embeddingsError } = await supabase
    .rpc('count_embeddings_for_version', { version_id_param: versions.id })
    .single();

  let embeddingsCount = 0;
  
  // Se RPC não existir, usar query alternativa
  if (embeddingsError) {
    console.log('   (Usando query alternativa para contar embeddings)');
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_version_id', versions.id);
    
    if (chunks && chunks.length > 0) {
      // Contar em lotes de 100
      for (let i = 0; i < chunks.length; i += 100) {
        const batch = chunks.slice(i, i + 100).map(c => c.id);
        const { count } = await supabase
          .from('document_embeddings')
          .select('*', { count: 'exact', head: true })
          .in('document_chunk_id', batch);
        embeddingsCount += count || 0;
      }
    }
  }

  console.log('🔢 Total de embeddings no banco:', embeddingsCount);

  // 5. Buscar alguns chunks de exemplo
  const { data: sampleChunks, error: sampleError } = await supabase
    .from('document_chunks')
    .select('chunk_index, content')
    .eq('document_version_id', versions.id)
    .order('chunk_index', { ascending: true })
    .limit(3);

  if (sampleError || !sampleChunks) {
    console.error('❌ Erro ao buscar chunks de exemplo:', sampleError);
    return;
  }

  console.log('\n📝 Primeiros 3 chunks:');
  sampleChunks.forEach((chunk, i) => {
    console.log(`\n--- Chunk ${chunk.chunk_index} ---`);
    console.log(`Tamanho: ${chunk.content.length} chars`);
    console.log(`Conteúdo: ${chunk.content.substring(0, 200)}...`);
  });

  // 6. Verificar presença de funcionário específico
  const { data: searchResults, error: searchError } = await supabase
    .from('document_chunks')
    .select('chunk_index, content')
    .eq('document_version_id', versions.id)
    .ilike('content', '%Abel Barbosa de Almeida Ferreira%')
    .limit(1);

  console.log('\n🔎 Buscando funcionário específico (Abel Barbosa):');
  if (searchError) {
    console.error('❌ Erro na busca:', searchError);
  } else if (!searchResults || searchResults.length === 0) {
    console.log('⚠️  Funcionário Abel Barbosa NÃO encontrado nos chunks!');
  } else {
    console.log('✅ Funcionário Abel Barbosa ENCONTRADO:');
    console.log(`   Chunk #${searchResults[0].chunk_index}`);
    console.log(`   Conteúdo: ${searchResults[0].content.substring(0, 300)}...`);
  }

  // 7. Análise do CSV original
  console.log('\n📂 Arquivo CSV Original:');
  const csvPath = path.join(__dirname, 'downloads', 'Cadastro de Trabalhadores.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('⚠️  Arquivo CSV não encontrado em:', csvPath);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
  const dataLines = lines.length - 1; // Remove header
  
  console.log(`   Total de linhas: ${lines.length}`);
  console.log(`   Linhas de dados (sem header): ${dataLines}`);
  console.log(`   Header: ${lines[0].substring(0, 100)}...`);

  // 8. Comparação final
  console.log('\n📊 COMPARAÇÃO:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`CSV Original:     ${dataLines} registros de funcionários`);
  console.log(`Banco de Dados:   ${chunksCount} chunks criados`);
  console.log(`Embeddings:       ${embeddingsCount} embeddings gerados`);
  console.log('═══════════════════════════════════════════════════════');

  if (chunksCount === 0) {
    console.log('❌ PROBLEMA: Nenhum chunk foi criado!');
  } else if (chunksCount !== null && chunksCount < dataLines * 0.8) {
    console.log('⚠️  ATENÇÃO: Chunks muito abaixo do esperado (menos de 80%)');
    console.log(`   Possível perda de dados: ${dataLines - chunksCount} registros`);
  } else if (chunksCount !== null && chunksCount >= dataLines * 0.8 && chunksCount <= dataLines * 1.2) {
    console.log('✅ SUCESSO: Quantidade de chunks compatível com dados originais');
    console.log('   (chunks agrupam 1-2 linhas dependendo do tamanho)');
  } else {
    console.log('⚠️  INFO: Mais chunks que linhas originais');
    console.log('   (linhas grandes foram divididas em múltiplos chunks)');
  }

  if (embeddingsCount !== chunksCount) {
    console.log(`⚠️  ATENÇÃO: Embeddings (${embeddingsCount}) ≠ Chunks (${chunksCount})`);
    console.log('   Indexação ainda em progresso ou falhou parcialmente');
  } else {
    console.log('✅ Todos os chunks foram indexados com sucesso!');
  }
}

verificarDados()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error);
    process.exit(1);
  });
