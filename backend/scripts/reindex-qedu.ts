/**
 * RE-INDEXAR DADOS DO QEDU
 * Deleta documentos antigos do QEdu e re-indexa com Puppeteer
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteQEduDocuments() {
  console.log('🗑️  Deletando documentos antigos do QEdu...\n');

  // 1. Buscar documentos do QEdu
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .or('name.ilike.%QEdu%,name.ilike.%Saquarema%Ideb%,name.ilike.%Taxas%Rendimento%,name.ilike.%Censo%Escolar%,name.ilike.%Aprendizado%Saeb%,name.ilike.%Distorção%Idade%,name.ilike.%Ensino%Técnico%,name.ilike.%Enem%');

  console.log(`📚 Encontrados ${docs?.length || 0} documentos do QEdu:`);
  docs?.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.name}`);
  });

  if (!docs || docs.length === 0) {
    console.log('\n✅ Nenhum documento para deletar');
    return;
  }

  console.log('\n⚠️  Deletando documentos em cascata...');

  for (const doc of docs) {
    // Deletar versões (cascata vai deletar chunks e embeddings)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (error) {
      console.error(`  ❌ Erro ao deletar ${doc.name}:`, error.message);
    } else {
      console.log(`  ✅ Deletado: ${doc.name}`);
    }
  }

  console.log('\n✅ Limpeza concluída!');
}

deleteQEduDocuments()
  .then(() => {
    console.log('\n🎯 Agora execute: npx tsx scripts/unified-knowledge-indexer.ts');
    console.log('   Para re-indexar com o conteúdo correto do QEdu\n');
  })
  .catch(console.error);
