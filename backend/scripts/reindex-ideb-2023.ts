/**
 * Re-indexar apenas arquivos IDEB 2023
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXCEL_FOLDER = path.join(__dirname, 'downloads');

async function reindexIdebFiles() {
  console.log('🔄 RE-INDEXANDO ARQUIVOS IDEB 2023\n');
  
  // Buscar documentos IDEB no banco
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .eq('domain', 'INDICADORES_EDUCACIONAIS')
    .eq('subdomain', 'IDEB')
    .eq('metadata_year', 2023);
  
  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento IDEB 2023 encontrado\n');
    return;
  }
  
  console.log(`✅ Encontrados ${docs.length} documentos IDEB 2023:\n`);
  
  for (const doc of docs) {
    console.log(`📄 Processando: ${doc.name}`);
    
    const filePath = path.join(EXCEL_FOLDER, doc.name);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️ Arquivo não encontrado: ${filePath}\n`);
      continue;
    }
    
    // Ler Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Converter para texto
    let text = '';
    for (const row of jsonData) {
      const rowData = (row as any[]).filter(cell => cell !== null && cell !== undefined);
      if (rowData.length > 0) {
        text += rowData.join(' | ') + '\n';
      }
    }
    
    console.log(`   📖 Texto extraído: ${text.length} caracteres`);
    
    // Dividir em chunks (1500 caracteres)
    const chunks: string[] = [];
    const chunkSize = 1500;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    console.log(`   ✂️ Criados ${chunks.length} chunks`);
    
    // Buscar version_id
    const { data: versions } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', doc.id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!versions || versions.length === 0) {
      console.log(`   ⚠️ Nenhuma versão encontrada, criando...\n`);
      
      const { data: newVersion } = await supabase
        .from('document_versions')
        .insert({
          document_id: doc.id,
          version_number: 1,
          status: 'COMPLETED',
        })
        .select()
        .single();
      
      if (!newVersion) {
        console.log(`   ❌ Erro ao criar versão\n`);
        continue;
      }
      
      if (versions) {
        versions.push(newVersion);
      }
    }
    
    if (!versions || versions.length === 0) {
      console.log(`   ❌ Nenhuma versão criada\n`);
      continue;
    }
    
    const versionId = versions[0].id;
    
    // Deletar chunks antigos
    const { data: oldChunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_version_id', versionId);
    
    if (oldChunks && oldChunks.length > 0) {
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_version_id', versionId);
      console.log(`   🗑️ Deletados ${oldChunks.length} chunks antigos`);
    }
    
    // Inserir novos chunks
    const chunksData = chunks.map((content, index) => ({
      document_version_id: versionId,
      content,
      chunk_index: index,
      metadata: {},
    }));
    
    const { data: insertedChunks, error: chunkError } = await supabase
      .from('document_chunks')
      .insert(chunksData)
      .select();
    
    if (chunkError) {
      console.log(`   ❌ Erro ao inserir chunks: ${chunkError.message}\n`);
      continue;
    }
    
    console.log(`   ✅ ${insertedChunks!.length} chunks inseridos`);
    
    // Gerar embeddings
    let embeddingsCreated = 0;
    for (const chunk of insertedChunks!) {
      // Gerar embedding com OpenAI
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: chunk.content,
        }),
      });
      
      const data = await response.json();
      const embedding = data.data[0].embedding;
      
      // Inserir embedding
      await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
        });
      
      embeddingsCreated++;
      
      if (embeddingsCreated % 5 === 0) {
        console.log(`   🔢 ${embeddingsCreated}/${insertedChunks!.length} embeddings criados`);
      }
    }
    
    console.log(`   ✅ ${embeddingsCreated} embeddings criados\n`);
  }
  
  console.log('✅ RE-INDEXAÇÃO CONCLUÍDA!\n');
}

reindexIdebFiles().catch(console.error);
