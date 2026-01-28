import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🗑️  Deletando documentos Excel incompletos...\n');

  // Buscar documentos que contêm "territorios" no nome
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, name')
    .or('name.ilike.%territorios%,name.ilike.%permanencias%,name.ilike.%ideb%');

  if (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    return;
  }

  if (!docs || docs.length === 0) {
    console.log('✅ Nenhum documento encontrado para deletar');
    return;
  }

  console.log(`📊 Encontrados ${docs.length} documentos:\n`);
  docs.forEach(doc => console.log(`  - ${doc.name}`));

  console.log(`\n🗑️  Deletando...`);

  for (const doc of docs) {
    const { error: delError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (delError) {
      console.error(`❌ Erro ao deletar ${doc.name}:`, delError.message);
    } else {
      console.log(`✅ Deletado: ${doc.name}`);
    }
  }

  console.log('\n✅ Limpeza concluída!');
}

main().catch(console.error);
